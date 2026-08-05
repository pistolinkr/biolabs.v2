import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Shield } from "lucide-react";
import type { ByokProviderId } from "@/lib/ai/aiKeysStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const BYOK_PROVIDER_META: Record<
  ByokProviderId,
  { labelKey: string; getKeyUrl: string }
> = {
  openai: {
    labelKey: "binary.providers.openai",
    getKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    labelKey: "binary.providers.anthropic",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    labelKey: "binary.providers.google",
    getKeyUrl: "https://aistudio.google.com/apikey",
  },
};

export interface SecureApiKeyModalProps {
  open: boolean;
  provider: ByokProviderId | null;
  onOpenChange: (open: boolean) => void;
  onSave: (provider: ByokProviderId, apiKey: string) => void;
}

/**
 * Secure input guide — paste a provider API key that stays in this browser.
 */
export default function SecureApiKeyModal({
  open,
  provider,
  onOpenChange,
  onSave,
}: SecureApiKeyModalProps) {
  const { t } = useTranslation("assistant");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
    }
  }, [open, provider]);

  const meta = provider ? BYOK_PROVIDER_META[provider] : null;
  const providerLabel = meta ? t(meta.labelKey) : "";
  const canSave = value.trim().length >= 8;

  const submit = () => {
    if (!provider) return;
    const key = value.trim();
    if (key.length < 8) {
      setError(t("binary.secureKeyTooShort"));
      return;
    }
    onSave(provider, key);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-md rounded-none border-border bg-card p-0 shadow-none sm:max-w-md"
      >
        <DialogHeader className="gap-3 border-b border-border px-[18px] py-4 text-left">
          <div className="flex items-center gap-2">
            <Shield size={16} className="shrink-0 text-accent" strokeWidth={1.5} />
            <DialogTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-foreground">
              {t("binary.secureInputTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
            {t("binary.secureInputBody", { provider: providerLabel })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-[18px] py-4">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="biolabs-secure-api-key"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground"
            >
              {providerLabel}
            </label>
            {meta ? (
              <a
                href={meta.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] text-accent hover:underline"
              >
                {t("binary.getApiKey")}
                <ExternalLink size={11} strokeWidth={1.5} />
              </a>
            ) : null}
          </div>

          <input
            id="biolabs-secure-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t("binary.secureKeyPlaceholder")}
            className="w-full border border-border bg-input px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />

          {error ? (
            <p className="font-mono text-[10px] text-destructive">{error}</p>
          ) : (
            <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
              {t("binary.secureInputNote")}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border px-[18px] py-3 sm:justify-between">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="border border-border bg-secondary px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("binary.secureCancel")}
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={submit}
            className={cn(
              "border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors",
              canSave
                ? "border-accent bg-accent/15 text-foreground hover:bg-accent/25"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            {t("binary.secureSave")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
