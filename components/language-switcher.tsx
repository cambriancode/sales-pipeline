"use client";

export function LanguageSwitcher({ locale, next }: { locale: "es" | "en"; next: string }) {
  return (
    <form action="/api/locale" method="post" className="flex items-center gap-2 text-sm">
      <input type="hidden" name="next" value={next} />
      <select
        name="locale"
        defaultValue={locale}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>
    </form>
  );
}
