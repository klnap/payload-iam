import { cx } from 'tailwind-variants'

export default function GoogleBrandIcon() {
  return (
    <svg
      aria-hidden
      className={cx('h-5', 'w-5', 'shrink-0')}
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.971-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866.549 3.921 1.453l2.814-2.814C17.503 2.988 15.107 2 12.545 2 7.021 2 2.543 6.477 2.543 12s4.478 10 10.062 10c5.166 0 9.425-3.947 9.425-9.885 0-.667-.074-1.323-.214-1.952H12.545z'
        fill='currentColor'
      />
    </svg>
  )
}
