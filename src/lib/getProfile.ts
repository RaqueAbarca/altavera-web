import { supabase } from "./supabase";

export async function getProfile(){

  const {
    data:{
      user
    }
  } = await supabase.auth.getUser();


  if(!user){
    return null;
  }


  const {
    data:profile
  } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();


  return profile;

}