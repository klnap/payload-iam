import type { LoginViewLabels } from '#iam/modules/auth/ui/hooks/get-login-labels'
import { CreateRootForm, isRootBootstrapAllowed } from '#iam/modules/bootstrap'
import { GuestPage } from '#iam/shared/ui/guest/guest-page'

type Props = {
  adminRoute: string
  labels: Pick<
    LoginViewLabels,
    | 'createRootTitle'
    | 'createRootDescription'
    | 'createRootFullName'
    | 'createRootSubmit'
    | 'createRootFullNameRequired'
    | 'createRootEmailRequired'
    | 'createRootError'
    | 'email'
    | 'rootRequiredTitle'
    | 'rootRequiredDescription'
  >
}

export default function LoginBootstrapSection({ adminRoute, labels }: Props) {
  if (!isRootBootstrapAllowed()) {
    return (
      <GuestPage>
        <GuestPage.Header>
          <GuestPage.Title>{labels.rootRequiredTitle}</GuestPage.Title>
          <GuestPage.Description role='alert'>
            {labels.rootRequiredDescription}
          </GuestPage.Description>
        </GuestPage.Header>
      </GuestPage>
    )
  }

  return (
    <CreateRootForm
      adminRoute={adminRoute}
      labels={{
        title: labels.createRootTitle,
        description: labels.createRootDescription,
        email: labels.email,
        fullName: labels.createRootFullName,
        submit: labels.createRootSubmit,
        fullNameRequired: labels.createRootFullNameRequired,
        emailRequired: labels.createRootEmailRequired,
        error: labels.createRootError,
      }}
    />
  )
}
