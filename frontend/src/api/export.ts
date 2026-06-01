import { api } from './client'

async function downloadBlob(url: string, fallbackFilename: string) {
  const response = await api.get(url, { responseType: 'blob' })

  // try to read filename from Content-Disposition (UTF-8 form)
  const disposition = response.headers['content-disposition'] as string | undefined
  let filename = fallbackFilename
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    if (utf8Match) {
      filename = decodeURIComponent(utf8Match[1])
    } else {
      const asciiMatch = disposition.match(/filename="([^"]+)"/i)
      if (asciiMatch) filename = asciiMatch[1]
    }
  }

  const blob = new Blob([response.data], {
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export const exportApi = {
  student: (studentId: string, fallbackName = 'student.xlsx') =>
    downloadBlob(`/students/${studentId}/export`, fallbackName),

  classroom: (classroomId: string, fallbackName = 'classroom.xlsx') =>
    downloadBlob(`/classrooms/${classroomId}/export`, fallbackName),
}