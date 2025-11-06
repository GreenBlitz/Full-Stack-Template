// בס"ד
import { useState, type FC } from "react";

const counterStartingValue = 0;
const App: FC = () => {
  const [count, setCount] = useState(counterStartingValue);

  return (
    <>
      <div></div>
      <h1>Vite + React</h1>
      <div className="card">
        <button
          onClick={() => {
            setCount((prevCount) => prevCount++);
          }}
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
};

export default App;
