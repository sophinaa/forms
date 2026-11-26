// Organiser page: confirm before removing, and filter the attendee table.
document.querySelectorAll('form.js-confirm').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!confirm(form.dataset.confirm || 'Are you sure?')) e.preventDefault()
  })
})

const search = document.getElementById('search')
if (search) {
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase()
    document.querySelectorAll('tbody tr').forEach((tr) => {
      tr.hidden = q && !tr.dataset.search.includes(q)
    })
  })
}
