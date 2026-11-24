import type { Metadata } from "next"
import Link from "next/link"
import { OrbitMark } from "@omnifit/ui"
import { ClientInviteAcceptPanel } from "@/features/client-invite/ClientInviteAcceptPanel"
import { getClientInvitePreview } from "@/features/client-invite/get-client-invite-preview"
import { buildClientInviteAcceptLabels } from "@/features/client-invite/labels"
import { getAppUser } from "@/lib/auth/get-app-user"
import { getServerTranslator } from "@/lib/i18n/get-server-translator"
import { LocaleSwitcher } from "@/components/shell/LocaleSwitcher"
import { ROUTES } from "@/lib/routes"

type ClientInvitePageProps = {
  params: Promise<{ token: string }>
}

export const generateMetadata = async ({
  params,
}: ClientInvitePageProps): Promise<Metadata> => {
  const { token } = await params
  const { t } = await getServerTranslator()
  const preview = await getClientInvitePreview(token)

  if (preview.valid === true) {
    return {
      title: t("meta.inviteAcceptNamed").replace("{coach}", preview.coachName),
    }
  }

  return { title: t("meta.inviteAccept") }
}

const InviteChrome = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-dvh bg-cream">
    <header className="flex items-center justify-between px-4 py-5 sm:px-8">
      <Link href={ROUTES.home} className="flex items-center gap-2.5">
        <OrbitMark size={26} className="text-pine" title="OmniFit" />
        <span className="font-display text-lg font-bold text-ink-900">OmniFit</span>
      </Link>
      <LocaleSwitcher />
    </header>
    {children}
  </div>
)

export default async function ClientInvitePage({ params }: ClientInvitePageProps) {
  const { token } = await params
  const trimmed = token.trim()
  const { t } = await getServerTranslator()
  const labels = buildClientInviteAcceptLabels(t)
  const preview = await getClientInvitePreview(trimmed)
  const appUser = await getAppUser()
  const coachFallback = labels.coachFallback

  if (preview.valid === false) {
    if (preview.error === "already_accepted") {
      return (
        <InviteChrome>
          <ClientInviteAcceptPanel
            token={trimmed}
            coachName={preview.coachName ?? coachFallback}
            inviteEmail=""
            acceptMode="new_user"
            sharedLogDisclosure={false}
            otherCoaches={[]}
            isAuthenticated={Boolean(appUser)}
            signedInRole={appUser?.role === "coach" ? "coach" : appUser?.role === "client" ? "client" : null}
            emailMatches={false}
            labels={labels}
            variant="already_accepted"
            authEmailLabel={t("auth.email")}
            authShowPassword={t("auth.showPassword")}
            authHidePassword={t("auth.hidePassword")}
          />
        </InviteChrome>
      )
    }

    const errorCopy =
      preview.error === "expired"
        ? { title: labels.expiredTitle, body: labels.expiredBody }
        : preview.error === "revoked"
          ? { title: labels.revokedTitle, body: labels.revokedBody }
          : { title: labels.errorGeneric, body: "" }

    return (
      <InviteChrome>
        <main className="mx-auto flex max-w-md flex-col justify-center gap-3 px-4 py-10">
          <h1 className="font-display text-2xl font-bold text-ink-900">{errorCopy.title}</h1>
          {errorCopy.body ? (
            <p className="text-sm text-ink-500">{errorCopy.body}</p>
          ) : null}
        </main>
      </InviteChrome>
    )
  }

  const normalizedInviteEmail = preview.inviteEmail.trim().toLowerCase()
  const normalizedUserEmail = appUser?.email?.trim().toLowerCase() ?? ""
  const emailMatches =
    Boolean(normalizedUserEmail) && normalizedUserEmail === normalizedInviteEmail

  const variant =
    preview.status === "accepted" ? ("already_accepted" as const) : ("ready" as const)

  return (
    <InviteChrome>
      <ClientInviteAcceptPanel
        token={trimmed}
        coachName={preview.coachName || coachFallback}
        inviteEmail={preview.inviteEmail}
        acceptMode={preview.acceptMode}
        sharedLogDisclosure={preview.sharedLogDisclosure}
        otherCoaches={preview.otherCoaches}
        isAuthenticated={Boolean(appUser)}
        signedInRole={
          appUser?.role === "coach"
            ? "coach"
            : appUser?.role === "client"
              ? "client"
              : null
        }
        emailMatches={emailMatches}
        labels={labels}
        variant={variant}
        authEmailLabel={t("auth.email")}
        authShowPassword={t("auth.showPassword")}
        authHidePassword={t("auth.hidePassword")}
      />
    </InviteChrome>
  )
}
