export default function Footer() {
  return (
    <footer className="py-6 px-6 border-t mt-8">
      <div className="max-w-6xl mx-auto text-sm text-gray-600">
        © {new Date().getFullYear()} Husaria Research — All rights reserved.
      </div>
    </footer>
  );
}
