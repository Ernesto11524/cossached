import { useEffect } from 'react'

/**
 * Adds the "in" class to any .reveal element when it enters the viewport.
 * Call once at the top of a page component — safe to call in any page that
 * uses .reveal elements, including after route changes (the effect re-runs).
 */
export function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}
