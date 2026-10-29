# IAM UI shells (guest + email)

Architecture-only refactor: compound layout APIs without visual redesign.

## Guest

```tsx
<GuestLayout logo={<GuestLogo {...guestLogoPropsFromAdminView(...)} />}>
  <GuestPage>
    <GuestPage.Header>
      <GuestPage.Title>{title}</GuestPage.Title>
      {description && <GuestPage.Description>{description}</GuestPage.Description>}
    </GuestPage.Header>
    <GuestPage.Content>
      <form className={guestForm}>...</form>
    </GuestPage.Content>
    {loginHref && <GuestPage.Back href={loginHref}>Back to login</GuestPage.Back>}
  </GuestPage>
</GuestLayout>
```

- `GuestPage.Description` and `GuestPage.Back` are optional by omission (`condition && <Component />`).
- `guestForm` keeps Payload form hooks; page spacing/typography live on `GuestPage.*`.
- `GuestPage.Back`: `href` → server link; `onClick` → client button leaf.

## Email

```tsx
<EmailLayout preview={...} brand={...} theme={...} fonts={...} footerLine={...}>
  <Email.Title theme={theme}>{title}</Email.Title>
  <Email.Description theme={theme}>{intro}</Email.Description>
  <Email.Content>{children}</Email.Content>
  {metaLine && <Email.Meta theme={theme}>{metaLine}</Email.Meta>}
</EmailLayout>
```

`TransactionalEmailLayout` / `IamTransactionalEmailLayout` delegate to the above (compatibility facades).

## Admin account

`AccountPageFrame` remains; no `AdminPage` compound without multiple consumers.
