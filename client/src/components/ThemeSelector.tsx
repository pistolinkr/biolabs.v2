import { useTranslation } from "react-i18next";
import WorkstationSelect from "@/components/WorkstationSelect";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeSelectorProps {
  className?: string;
}

/** System / light / dark — synced with `next-themes` and `html.light` / `html.dark`. */
export default function ThemeSelector({ className }: ThemeSelectorProps) {
  const { t } = useTranslation("common");
  const { systemTheme, setTheme } = useTheme();

  return (
    <WorkstationSelect
      value={systemTheme ?? "system"}
      onValueChange={setTheme}
      aria-label={t("theme.system")}
      className={className}
      options={[
        { value: "system", label: t("theme.system") },
        { value: "dark", label: t("theme.dark") },
        { value: "light", label: t("theme.light") },
      ]}
    />
  );
}
