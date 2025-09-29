import { useFractal } from '@fractal-mcp/server-ui-react';

export default function Hello() {
  const { data, link, tool } = useFractal();
  const name = (data && (data.name as string)) || 'World';

  const handleGoodbyeClick = () => {
    tool('goodbye', { name });
  };

  return (
    <div className="bg-white rounded-lg p-6 w-64 shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Hello</h2>
      <p className="text-gray-600 mb-4">
        Hello, <span className="font-semibold text-blue-600">{name}</span>!
      </p>
      <button
        onClick={handleGoodbyeClick}
        className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
      >
        Say Goodbye
      </button>
    </div>
  );
}


