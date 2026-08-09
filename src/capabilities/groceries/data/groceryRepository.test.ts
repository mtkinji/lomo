import { createGroceryRepository, mapGroceryProjectionRows } from './groceryRepository';

describe('Grocery repository', () => {
  it('projects retailer cart acknowledgement without changing grocery state', () => {
    const [list] = mapGroceryProjectionRows([{id:'list-1',revision:1,status:'ready',updated_at:'2026-08-09',items:[{id:'item-1',position:0,concept:'milk',quantity_min:1,quantity_max:null,unit:'gallon',aisle:'dairy_eggs',state:'needed',sources:[],cart_entries:[{provider:'kroger',retailer_label:"Smith's",location_name:'Saratoga Springs',state:'cart_add_acknowledged',created_at:'2026-08-09T12:00:00Z'}]}]}]);
    expect(list.items[0]).toMatchObject({
      state: 'needed',
      retailerCart: { provider: 'kroger', retailerLabel: "Smith's", locationName: 'Saratoga Springs', state: 'cart_add_acknowledged' },
    });
  });

  it('compiles through the server boundary and mutates only through revisioned RPCs', async () => {
    const invoke=jest.fn().mockResolvedValue({data:{receipt:{}},error:null}); const rpc=jest.fn().mockResolvedValue({data:{},error:null}); const repository=createGroceryRepository({functions:{invoke},rpc} as never);
    await repository.compile('plan-1',3); await repository.compile('plan-1',4,{fromListId:'list-1',expectedRevision:5}); await repository.compileRecipe({
      recipeId:'recipe-1',recipeVersionId:'version-1',recipeVersion:2,contentHash:'sha256:recipe-1-v2',sourceType:'manual',title:'Onion soup',yieldQuantity:4,
      ingredients:[{id:'ingredient-1',originalText:'2 onions',optional:false}],servings:8,
    }); await repository.setItemState('item-1',2,'already_have'); await repository.addItem('list-1',3,'Dish soap'); await repository.markReviewed('list-1',4); await repository.handoff('list-1',5,'instacart'); await repository.markHandoffOpened('handoff-1');
    expect(invoke).toHaveBeenCalledWith('grocery-compile',{body:{planId:'plan-1',expectedVersion:3}});
    expect(invoke).toHaveBeenNthCalledWith(2,'grocery-compile',{body:{planId:'plan-1',expectedVersion:4,rebaseFromListId:'list-1',expectedRebaseRevision:5}});
    expect(invoke).toHaveBeenNthCalledWith(3,'grocery-compile',{body:{recipe:{recipeId:'recipe-1',recipeVersionId:'version-1',recipeVersion:2,contentHash:'sha256:recipe-1-v2',sourceType:'manual',title:'Onion soup',yieldQuantity:4,ingredients:[{id:'ingredient-1',originalText:'2 onions',optional:false}]},servings:8}});
    expect(rpc.mock.calls.map((call)=>call[0])).toEqual(['set_kwilt_grocery_item_state','add_kwilt_grocery_item','mark_kwilt_grocery_list_reviewed']);
    expect(invoke).toHaveBeenNthCalledWith(4,'grocery-handoff',{body:{groceryListId:'list-1',expectedRevision:5,provider:'instacart'}});
    expect(invoke).toHaveBeenNthCalledWith(5,'grocery-handoff',{body:{action:'opened',handoffId:'handoff-1'}});
  });

  it('resolves an Activity from grocery authority and latest private handoff metadata', async () => {
    const listChain:any={select:jest.fn(),eq:jest.fn(),maybeSingle:jest.fn().mockResolvedValue({data:{id:'list-1',status:'ready'},error:null})};listChain.select.mockReturnValue(listChain);listChain.eq.mockReturnValue(listChain);
    const handoffChain:any={select:jest.fn(),eq:jest.fn(),order:jest.fn(),limit:jest.fn(),maybeSingle:jest.fn().mockResolvedValue({data:{state:'provider_link_created',expires_at:'2099-01-01T00:00:00.000Z'},error:null})};handoffChain.select.mockReturnValue(handoffChain);handoffChain.eq.mockReturnValue(handoffChain);handoffChain.order.mockReturnValue(handoffChain);handoffChain.limit.mockReturnValue(handoffChain);
    const from=jest.fn((table)=>table==='kwilt_grocery_lists'?listChain:handoffChain);
    await expect(createGroceryRepository({from} as never).resolveActivity('list-1')).resolves.toEqual({state:'ready',handoffState:'provider_link_created',expiresAt:'2099-01-01T00:00:00.000Z'});
  });
});
