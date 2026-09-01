import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { parseCenadaPdf } from "@/lib/pricing/cenada/parseCenada";
import { processCenada } from "@/lib/pricing/cenada/processCenada";
import {
  getOrCreateCenadaCycleForSources,
  REQUIRED_CENADA_BULLETINS,
  resolveCenadaCycleSources,
  type CenadaCycleSource
} from "@/lib/pricing/cenada/cycle";

import type {
  CenadaBulletinType,
  ParsedCenadaDocument
} from "@/lib/pricing/cenada/types";

export const runtime="nodejs";

const MAX_FILES_PER_UPDATE=10;

type ParsedFile={
  file:File;
  parsed:ParsedCenadaDocument;
};

type FileResult={
  name:string;
  bulletinType:CenadaBulletinType;
  bulletinDate:string;
  success:boolean;
  rows:number;
  results:number;
  error?:string;
};

function parseRequestedCycleId(
  formData:FormData
){
  const rawCycleId=
    formData.get("cycleId");

  if(
    typeof rawCycleId!=="string"||
    !rawCycleId.trim()
  ){
    return undefined;
  }

  const cycleId=
    Number(rawCycleId);

  if(
    !Number.isInteger(cycleId)||
    cycleId<=0
  ){
    throw new Error(
      "cycleId no es válido"
    );
  }

  return cycleId;
}

export async function POST(
  request:Request
){
  const auth=
    await requireAdmin();

  if(!auth.ok){
    return auth.response;
  }

  try{
    const formData=
      await request.formData();

    const files=
      formData
        .getAll("files")
        .filter(
          (
            item
          ):item is File=>
            item instanceof File
        );

    if(files.length===0){
      return NextResponse.json(
        {
          error:
            "No se recibió ningún PDF"
        },
        {
          status:400
        }
      );
    }

    if(
      files.length>
      MAX_FILES_PER_UPDATE
    ){
      return NextResponse.json(
        {
          error:
            `Puede procesar un máximo de ${MAX_FILES_PER_UPDATE} PDFs por actualización`
        },
        {
          status:400
        }
      );
    }

    let requestedCycleId:
      number|undefined;

    try{
      requestedCycleId=
        parseRequestedCycleId(
          formData
        );
    }catch(error){
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ?error.message
              :"cycleId no es válido"
        },
        {
          status:400
        }
      );
    }

    const parsedFiles:
      ParsedFile[]=[];

    for(const file of files){
      try{
        console.log(
          `Analizando CENADA: ${file.name}`
        );

        const parsed=
          await parseCenadaPdf(
            file
          );

        parsedFiles.push({
          file,
          parsed
        });

      }catch(error){
        return NextResponse.json(
          {
            error:
              `No se pudo interpretar ${file.name}`,
            details:
              error instanceof Error
                ?error.message
                :"Error desconocido"
          },
          {
            status:400
          }
        );
      }
    }

    /*
     * Permitimos varios PDFs del mismo tipo.
     * Todos se guardan como histórico CENADA.
     * Para el ciclo se elegirá después la fecha
     * más reciente disponible de cada tipo.
     */
    parsedFiles.sort(
      (a,b)=>{
        const typeCompare=
          a.parsed.bulletinType
            .localeCompare(
              b.parsed.bulletinType
            );

        if(typeCompare!==0){
          return typeCompare;
        }

        return a.parsed.bulletinDate
          .localeCompare(
            b.parsed.bulletinDate
          );
      }
    );

    const fileResults:
      FileResult[]=[];

    const uploadedSources:
      CenadaCycleSource[]=[];

    let totalRows=0;
    let totalResults=0;

    for(const item of parsedFiles){
      const {
        file,
        parsed
      }=item;

      totalRows+=
        parsed.rows.length;

      try{
        console.log(
          `Procesando CENADA: ${file.name}`
        );

        const results=
          await processCenada(
            parsed.rows
          );

        totalResults+=
          results.length;

        uploadedSources.push({
          bulletinType:
            parsed.bulletinType,
          bulletinDate:
            parsed.bulletinDate,
          filename:
            file.name,
          rowsParsed:
            parsed.rows.length,
          rowsProcessed:
            results.length,
          origin:"uploaded"
        });

        fileResults.push({
          name:file.name,
          bulletinType:
            parsed.bulletinType,
          bulletinDate:
            parsed.bulletinDate,
          success:true,
          rows:
            parsed.rows.length,
          results:
            results.length
        });

      }catch(error){
        console.error(
          `Error procesando ${file.name}:`,
          error
        );

        fileResults.push({
          name:file.name,
          bulletinType:
            parsed.bulletinType,
          bulletinDate:
            parsed.bulletinDate,
          success:false,
          rows:
            parsed.rows.length,
          results:0,
          error:
            error instanceof Error
              ?error.message
              :"Error desconocido"
        });
      }
    }

    const successfulFiles=
      fileResults.filter(
        file=>file.success
      ).length;

    const failedFiles=
      files.length-
      successfulFiles;

    let cycleId:
      number|undefined;

    let cycleDate:
      string|null= null;

    let cycleStatus=
      "incomplete";

    let cycleReused=false;

    let selectedSources:
      CenadaCycleSource[]=[];

    let missingBulletins:
      CenadaBulletinType[]=
        [...REQUIRED_CENADA_BULLETINS];

    if(successfulFiles>0){
      const resolved=
        await resolveCenadaCycleSources(
          uploadedSources
        );

      selectedSources=
        resolved.sources;

      missingBulletins=
        resolved.missing;

      if(
        missingBulletins.length===0
      ){
        const cycleResult=
          await getOrCreateCenadaCycleForSources(
            selectedSources,
            requestedCycleId
          );

        cycleId=
          Number(
            cycleResult.cycle.id
          );

        cycleDate=
          cycleResult.cycle
            .cycle_date??null;

        cycleStatus=
          cycleResult.cycle
            .status??"ready";

        cycleReused=
          cycleResult.reused;
      }
    }

    const readyForPricingRun=
      Boolean(cycleId)&&
      missingBulletins.length===0;

    return NextResponse.json({
      success:
        failedFiles===0&&
        readyForPricingRun,

      processingSuccess:
        failedFiles===0,

      cycleId,
      cycleDate,
      cycleStatus,
      cycleReused,
      readyForPricingRun,

      completedBulletins:
        selectedSources.length,

      expectedBulletins:
        REQUIRED_CENADA_BULLETINS.length,

      missingBulletins,

      sources:
        selectedSources.map(
          source=>({
            bulletinType:
              source.bulletinType,
            bulletinDate:
              source.bulletinDate,
            filename:
              source.filename,
            reused:
              source.origin==="history"
          })
        ),

      totalFiles:
        files.length,
      successfulFiles,
      failedFiles,
      totalRows,
      totalResults,
      files:fileResults
    });

  }catch(error){
    console.error(
      "ERROR API CENADA:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ?error.message
            :"Error procesando boletines CENADA"
      },
      {
        status:500
      }
    );
  }
}
