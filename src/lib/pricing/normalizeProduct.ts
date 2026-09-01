const REMOVE_WORDS = [
  "primera",
  "segunda",
  "tercera",
  "extra",
  "supremo",
  "super",
  "grande",
  "mediana",
  "mediano",
  "pequeña",
  "pequeño",
]

export function normalizeProduct(name: string): string {

  let result = name.toLowerCase()

  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  result = result.replace(/[()\-]/g, " ")

  for (const word of REMOVE_WORDS) {

    const regex = new RegExp(`\\b${word}\\b`, "g")

    result = result.replace(regex, "")

  }

  result = result.replace(/\s+/g, " ").trim()

  return result

}