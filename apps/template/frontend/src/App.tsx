// בס"ד
import { useState, type FC } from "react";

const counterStartingValue = 0;
const countIncrement = 1;
const maxCountingValue = 5;
const App: FC = () => {
  const [count, setCount] = useState<string | number>(counterStartingValue);

  return (
    <div className="mx-auto">
      <h1>GreenBlitz Full-Stack Project:</h1>
      <div className="card">
        <button
          onClick={() => {
            setCount((prevCount) =>
              typeof prevCount === "number"
                ? prevCount >= maxCountingValue
                  ? "MI BOMBO"
                  : prevCount + countIncrement
                : prevCount + "!"
            );
          }}
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
    </div>
  );
};

export default App;
