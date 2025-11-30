import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="py-4 px-6 border-b">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="text-lg font-semibold">Husaria Research</div>
        <nav>
          <Link to="/" className="mr-4">Home</Link>
          <Link to="/financials" className="mr-4">Financials</Link>
          <Link to="/reports">Reports</Link>
        </nav>
      </div>
    </header>
  );
}
