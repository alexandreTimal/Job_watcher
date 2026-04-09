export default function HomePage() {
  return (
    <main className="container h-screen py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Job<span className="text-primary">Findeer</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          Votre veille emploi intelligente
        </p>
      </div>
    </main>
  );
}
