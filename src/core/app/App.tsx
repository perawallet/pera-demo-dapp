import Home from "../home/Home";
import useSetDynamicVhValue from "../hooks/useSetDynamicVh";

function App() {
  useSetDynamicVhValue();

  return <Home />;
}

export default App;
