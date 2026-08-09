import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { KrogerCartScreen } from './KrogerCartScreen';

const mockStatus=jest.fn();const mockConnect=jest.fn();const mockSearchLocations=jest.fn();
jest.mock('../data/krogerConnectionRepository',()=>({createKrogerConnectionRepository:()=>({status:mockStatus,connect:mockConnect,searchLocations:mockSearchLocations,selectLocation:jest.fn(),prepareMatches:jest.fn(),confirmMapping:jest.fn(),cartAdd:jest.fn()})}));
jest.mock('../data/groceryRepository',()=>({createGroceryRepository:()=>({list:jest.fn().mockResolvedValue([{id:'list-1',revision:2,status:'ready',items:[]}])})}));
jest.mock('../../../ui/layout/AppShell',()=>({AppShell:({children}:{children:ReactNode})=>children}));
jest.mock('../../../ui/layout/PageHeader',()=>({PageHeader:({title}:{title:string})=>title}));

describe('Smiths cart flow',()=>{
 beforeEach(()=>{mockStatus.mockReset();mockConnect.mockReset().mockResolvedValue({configured:true,connection:null});mockSearchLocations.mockReset().mockResolvedValue({locations:[]});});
 it('leads with connecting Smiths when no retailer account exists',async()=>{mockStatus.mockResolvedValue({configured:true,connection:null});const screen=render(<KrogerCartScreen navigation={{goBack:jest.fn()} as never} route={{params:{listId:'list-1'}} as never}/>);expect(await screen.findByRole('header',{name:"Connect Smith's"})).toBeTruthy();fireEvent.press(screen.getByRole('button',{name:"Connect Smith's"}));await waitFor(()=>expect(mockConnect).toHaveBeenCalled());});
 it('uses Saratoga Springs as the initial Smiths store search',async()=>{mockStatus.mockResolvedValue({configured:true,connection:{state:'active',retailerLabel:"Smith's",location:null,capabilities:{productMatch:true,cartAdd:true}}});const screen=render(<KrogerCartScreen navigation={{goBack:jest.fn()} as never} route={{params:{listId:'list-1'}} as never}/>);expect(await screen.findByDisplayValue('84045')).toBeTruthy();fireEvent.press(screen.getByRole('button',{name:"Find Smith's stores"}));await waitFor(()=>expect(mockSearchLocations).toHaveBeenCalledWith('84045'));});
 it('shows only the unavailable state when the production provider is disabled',async()=>{mockStatus.mockRejectedValue(new Error('provider_unavailable'));const screen=render(<KrogerCartScreen navigation={{goBack:jest.fn()} as never} route={{params:{listId:'list-1'}} as never}/>);expect(await screen.findByText("Smith's checkout isn't configured yet. Your plain list is still available.")).toBeTruthy();expect(screen.queryByRole('button',{name:"Connect Smith's"})).toBeNull();});
});
