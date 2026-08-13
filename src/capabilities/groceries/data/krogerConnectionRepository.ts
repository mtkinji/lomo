import type { SupabaseClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import type { KrogerFulfillmentMode, KrogerLocation, KrogerProduct } from '../providers/krogerProvider';

export type KrogerConnectionStatus={configured:boolean;connection:null|{state:'active'|'revoked'|'expired';retailerLabel:string;location:null|{id:string;name:string;address:string};capabilities:{productMatch:boolean;cartAdd:boolean}}};
export type KrogerMatch={groceryItem:{id:string;concept:string;quantity:number;unit:string|null};products:KrogerProduct[];rememberedMapping?:{provider:'kroger';locationId:string;concept:string;productId:string}|null;observedAt?:string};
async function invoke<T>(client:SupabaseClient,name:string,body:Record<string,unknown>):Promise<T>{const{data,error}=await client.functions.invoke(name,{body});if(error)throw new Error(error.message);return data as T;}
export function createKrogerConnectionRepository(client:SupabaseClient=getSupabaseClient()){
 return{
  status(){return invoke<KrogerConnectionStatus>(client,'kroger-api',{action:'status'});},
  async connect(){const start=await invoke<{authUrl:string}>(client,'kroger-auth',{});const result=await WebBrowser.openAuthSessionAsync(start.authUrl,'kwilt://kroger-auth');if(result.type!=='success'||!result.url.includes('status=success'))throw new Error('provider.connection_cancelled');return await this.status();},
  searchLocations(zipCode:string){return invoke<{locations:KrogerLocation[]}>(client,'kroger-api',{action:'locations',zipCode});},
  selectLocation(location:KrogerLocation){return invoke<{location:KrogerLocation}>(client,'kroger-api',{action:'select_location',location});},
  prepareMatches(groceryListId:string,expectedRevision:number,location:KrogerLocation,fulfillmentMode:KrogerFulfillmentMode){return invoke<{retailerLabel:string;location:{id:string;name:string;address:string};matches:KrogerMatch[]}>(client,'kroger-api',{action:'prepare_matches',groceryListId,expectedRevision,location,fulfillmentMode});},
  confirmMapping(groceryListId:string,groceryItemId:string,product:KrogerProduct,quantity:number,location:KrogerLocation){return invoke<{mappingId:string;state:'confirmed'}>(client,'kroger-api',{action:'confirm_mapping',groceryListId,groceryItemId,product,quantity,location});},
  cartAdd(groceryListId:string,expectedRevision:number,location:KrogerLocation,fulfillmentMode:KrogerFulfillmentMode){return invoke<{handoffId:string;state:'cart_add_acknowledged';cartUrl:string;addedItemCount:number;remainingItemCount:number;retailerLabel:string;replayed:boolean}>(client,'kroger-api',{action:'cart_add',groceryListId,expectedRevision,fulfillmentMode,locationConfirmation:{locationId:location.id,authority:'user_confirmed'}});},
  revoke(){return invoke<{state:'revoked'}>(client,'kroger-auth',{action:'revoke'});},
 };
}
