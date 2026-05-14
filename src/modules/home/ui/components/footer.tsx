export const Footer = () => {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="px-6 lg:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-sm font-semibold text-zinc-700">funroad</p>
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Funroad, Inc. All rights reserved.</p>
        <p className="text-xs text-zinc-400">Powered by <span className="font-semibold text-zinc-600">funroad</span></p>
      </div>
    </footer>
  );
};
