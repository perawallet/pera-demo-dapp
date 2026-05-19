import Home from "../home/Home";
import useSetDynamicVhValue from "../hooks/useSetDynamicVh";

const App = () => {
  useSetDynamicVhValue();

  return <Home />;
};

export default App;
