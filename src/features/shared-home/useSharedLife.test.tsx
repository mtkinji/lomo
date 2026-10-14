import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSharedLife } from './useSharedLife';
import { AppState, type AppStateStatus } from 'react-native';
import type { SharedLifeRepository } from './sharedLifeRepository';
const bootstrap = { households: [], people: [], householdChoices: [] };
it('does not let polling interrupt an older-page request', async () => {
  jest.useFakeTimers();
  const previous = AppState.currentState;
  AppState.currentState = 'active';
  let finish!: (value: unknown) => void;
  const page = (start: number) => ({
    posts: Array.from({ length: 30 }, (_, i) => ({
      id: String(start + i),
      createdAt: String(start + i),
    })),
  });
  const repository = {
    bootstrap: jest.fn().mockResolvedValue(bootstrap),
    list: jest
      .fn()
      .mockResolvedValueOnce(page(0))
      .mockResolvedValueOnce(page(30))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        }),
      ),
    command: jest.fn().mockResolvedValue({ posts: [] }),
  } as unknown as SharedLifeRepository;
  const { result, unmount } = renderHook(() =>
    useSharedLife('first', repository),
  );
  await act(async () => {});
  await act(async () => {
    await result.current.refresh(true);
  });
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.refresh(true);
  });
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  await act(async () => {
    finish(page(60));
    await pending;
  });
  expect(result.current.loading).toBe(false);
  expect(result.current.posts).toHaveLength(90);
  expect(repository.command).not.toHaveBeenCalled();
  unmount();
  AppState.currentState = previous;
  jest.useRealTimers();
});
it('drops late content when the account changes', async () => {
  let finish: (value: unknown) => void = () => undefined;
  const old = new Promise((resolve) => {
    finish = resolve;
  });
  const repository = {
    bootstrap: jest.fn().mockResolvedValue(bootstrap),
    list: jest.fn().mockReturnValueOnce(old).mockResolvedValue({ posts: [] }),
  } as unknown as SharedLifeRepository;
  const { result, rerender } = renderHook<
    ReturnType<typeof useSharedLife>,
    { user: string }
  >(({ user }) => useSharedLife(user, repository), {
    initialProps: { user: 'first' },
  });
  rerender({ user: 'second' });
  await act(async () => finish({ posts: [{ id: 'private' }] }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.posts).toEqual([]);
});
it('revalidates all previously loaded pages after backgrounding',async()=>{
 let change!:(state:AppStateStatus)=>void;
 const listener=jest.spyOn(AppState,'addEventListener').mockImplementation((_event,callback)=>{change=state=>{AppState.currentState=state;callback(state);};return {remove:jest.fn()};});
 const all=Array.from({length:60},(_,i)=>({id:String(i),createdAt:String(i)}));
 const repo={bootstrap:jest.fn().mockResolvedValue(bootstrap),list:jest.fn().mockResolvedValueOnce({posts:all.slice(0,30)}).mockResolvedValueOnce({posts:all.slice(30)}),command:jest.fn().mockResolvedValue({posts:all.filter(p=>p.id!=='12')})} as unknown as SharedLifeRepository;
 const {result,unmount}=renderHook(()=>useSharedLife('reader',repo));
 await act(async()=>{});await act(async()=>result.current.refresh(true));
 act(()=>change('background'));expect(result.current.posts).toEqual([]);
 await act(async()=>change('active'));
 expect(result.current.posts).toHaveLength(59);
 expect(repo.command).toHaveBeenCalledWith('refresh_posts',{ids:all.map(p=>p.id)});
 unmount();listener.mockRestore();
});
it('does not refresh a cleared feed while backgrounded or interrupt foreground restoration',async()=>{
 const previous=AppState.currentState;AppState.currentState='active';
 let change!:(state:AppStateStatus)=>void;
 const listener=jest.spyOn(AppState,'addEventListener').mockImplementation((_event,callback)=>{change=state=>{AppState.currentState=state;callback(state);};return {remove:jest.fn()};});
 let finish!:(value:unknown)=>void;
 const repo={bootstrap:jest.fn().mockResolvedValue(bootstrap),list:jest.fn().mockResolvedValue({posts:[{id:'old',createdAt:'old'}]}),command:jest.fn().mockImplementation(()=>new Promise(r=>{finish=r;}))} as unknown as SharedLifeRepository;
 const {result,unmount}=renderHook(()=>useSharedLife('reader',repo));
 await act(async()=>{});
 act(()=>change('background'));
 await act(async()=>result.current.revalidate());
 expect(repo.list).toHaveBeenCalledTimes(1);
 expect(result.current.posts).toEqual([]);
 act(()=>change('active'));
 await act(async()=>result.current.revalidate());
 expect(repo.list).toHaveBeenCalledTimes(1);
 await act(async()=>finish({posts:[{id:'old',createdAt:'old'}]}));
 expect(result.current.posts).toHaveLength(1);
 unmount();listener.mockRestore();AppState.currentState=previous;
});

it('suspends main-feed polling offscreen and preserves pages through background authorization on return', async () => {
  jest.useFakeTimers();
  const previous = AppState.currentState;
  AppState.currentState = 'active';
  let change!: (state: AppStateStatus) => void;
  const listener = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    change = state => { AppState.currentState = state; callback(state); };
    return { remove: jest.fn() };
  });
  const posts = Array.from({ length: 60 }, (_, i) => ({ id: String(i), createdAt: String(i) }));
  const list = jest.fn().mockResolvedValueOnce({ posts: posts.slice(0, 30) }).mockResolvedValueOnce({ posts: posts.slice(30) }).mockResolvedValue({ posts: posts.slice(0, 30) });
  const command = jest.fn().mockResolvedValue({ posts: posts.filter(p => p.id !== '12') });
  const repository = { bootstrap: jest.fn().mockResolvedValue(bootstrap), list, command } as unknown as SharedLifeRepository;
  const { result, rerender, unmount } = renderHook<ReturnType<typeof useSharedLife>, { focused: boolean }>(({ focused }) => useSharedLife('reader', repository, focused), { initialProps: { focused: true } });
  await act(async () => {});
  await act(async () => result.current.refresh(true));
  expect(result.current.posts).toHaveLength(60);
  rerender({ focused: false });
  list.mockClear();
  await act(async () => { jest.advanceTimersByTime(90_000); });
  expect(list).not.toHaveBeenCalled();
  expect(command).not.toHaveBeenCalled();
  act(() => change('background'));
  expect(result.current.posts).toEqual([]);
  await act(async () => change('active'));
  expect(command).not.toHaveBeenCalled();
  rerender({ focused: true });
  await act(async () => {});
  expect(command).toHaveBeenCalledWith('refresh_posts', { ids: posts.map(p => p.id) });
  expect(result.current.posts).toHaveLength(59);
  unmount();
  listener.mockRestore();
  AppState.currentState = previous;
  jest.useRealTimers();
});
