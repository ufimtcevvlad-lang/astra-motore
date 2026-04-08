import Link from "next/link";
import { TurnstileField } from "../../components/security/TurnstileField";
import { formatRuPhoneInput } from "../../lib/phone";

type Props = {
  error: string;
  name: string;
  onChangeName: (value: string) => void;
  phone: string;
  onChangePhone: (value: string) => void;
  onPhoneBlur: () => void;
  phoneTouched: boolean;
  phoneValid: boolean;
  comment: string;
  onChangeComment: (value: string) => void;
  consentPersonalData: boolean;
  onChangeConsentPersonalData: (value: boolean) => void;
  consentMarketing: boolean;
  onChangeConsentMarketing: (value: boolean) => void;
  onTurnstileToken: (token: string) => void;
};

export function RecipientFields({
  error,
  name,
  onChangeName,
  phone,
  onChangePhone,
  onPhoneBlur,
  phoneTouched,
  phoneValid,
  comment,
  onChangeComment,
  consentPersonalData,
  onChangeConsentPersonalData,
  consentMarketing,
  onChangeConsentMarketing,
  onTurnstileToken,
}: Props) {
  return (
    <>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">4. Получатель</h3>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
          Имя *
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          placeholder="Как к вам обращаться"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
          Телефон *
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => onChangePhone(formatRuPhoneInput(e.target.value))}
          onBlur={onPhoneBlur}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            phoneTouched && !phoneValid ? "border-red-500 bg-red-50 text-red-900" : "border-slate-300"
          }`}
          placeholder="+7 (902) 254-01-11"
        />
        {phoneTouched && !phoneValid && (
          <p className="mt-1 text-xs text-red-700">Введите номер в формате +7 (9XX) XXX-XX-XX</p>
        )}
      </div>
      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-1">
          Комментарий к заказу
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => onChangeComment(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          placeholder="Марка и модель авто, удобное время для звонка..."
        />
      </div>
      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consentPersonalData}
            onChange={(e) => onChangeConsentPersonalData(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500"
            required
          />
          <span>
            Я согласен(а) на{" "}
            <Link href="/consent-personal-data" className="text-amber-700 underline hover:text-amber-800">
              обработку персональных данных
            </Link>{" "}
            и ознакомлен(а) с{" "}
            <Link href="/privacy" className="text-amber-700 underline hover:text-amber-800">
              Политикой обработки персональных данных
            </Link>
            .
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consentMarketing}
            onChange={(e) => onChangeConsentMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500"
          />
          <span>Согласен(а) на получение информационных сообщений (необязательно).</span>
        </label>
      </div>
      <TurnstileField onTokenChange={onTurnstileToken} />
    </>
  );
}
