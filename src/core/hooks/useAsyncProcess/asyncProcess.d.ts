interface AsyncProcessState<Data = any, Payload = any> {
  isPending: boolean;
  isFetched: boolean;
  data: Data | null;
  error: Error | null;
  payload?: Payload;
}

interface UseAsyncProcessOptions<Data = any> {
  initialState?: AsyncProcessState<Data>;
  shouldResetDataWhenPending?: boolean;
}

type AsyncProcessCallBack<Data extends any> = <Response extends Data>(
  promise: Promise<Response>,
  responseSerializer?: (response: Response) => Data
) => Promise<Response>;

type AsyncStateSetter<Data> = React.Dispatch<
  React.SetStateAction<AsyncProcessState<Data, any>>
>;
