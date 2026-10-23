const slides = [...document.querySelectorAll('.slide')]
const prev = document.getElementById('prev')
const next = document.getElementById('next')
const progress = document.getElementById('progress')
const dots = document.getElementById('dots')

function indexFromHash() {
  const id = location.hash.replace('#', '')
  const found = slides.findIndex((slide) => slide.id === id)
  return found >= 0 ? found : 0
}

function paintDots(current) {
  dots.replaceChildren(
    ...slides.map((slide, index) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = index === current ? 'dot is-current' : 'dot'
      button.setAttribute('aria-label', `Go to slide ${index + 1}`)
      if (index === current) button.setAttribute('aria-current', 'true')
      button.addEventListener('click', () => show(index))
      return button
    }),
  )
}

function show(index) {
  const nextIndex = Math.max(0, Math.min(slides.length - 1, index))
  const active = document.activeElement
  for (const [i, slide] of slides.entries()) {
    const current = i === nextIndex
    slide.classList.toggle('is-active', current)
    slide.toggleAttribute('inert', !current)
    slide.setAttribute('aria-hidden', current ? 'false' : 'true')
  }
  if (active instanceof HTMLElement && slides.some((slide, i) => i !== nextIndex && slide.contains(active))) {
    document.getElementById('deck')?.focus()
  }
  progress.textContent = `${nextIndex + 1} / ${slides.length}`
  prev.disabled = nextIndex === 0
  next.disabled = nextIndex === slides.length - 1
  paintDots(nextIndex)
  const id = slides[nextIndex].id
  if (location.hash.replace('#', '') !== id) history.replaceState(null, '', `#${id}`)
}

prev.addEventListener('click', () => show(indexFromHash() - 1))
next.addEventListener('click', () => show(indexFromHash() + 1))
window.addEventListener('hashchange', () => show(indexFromHash()))
window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === 'PageDown') {
    show(indexFromHash() + 1)
  } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    event.preventDefault()
    show(indexFromHash() - 1)
  } else if (event.key === 'Home') {
    show(0)
  } else if (event.key === 'End') {
    show(slides.length - 1)
  }
})
show(indexFromHash())
