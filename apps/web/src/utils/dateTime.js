const padDatePart = (value) => String(value).padStart(2, "0")

export const formatForDateTimeLocal = (value) => {
    if (!value) return ""

    const date = value instanceof Date ? value : new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ""
    }

    const year = date.getFullYear()
    const month = padDatePart(date.getMonth() + 1)
    const day = padDatePart(date.getDate())
    const hours = padDatePart(date.getHours())
    const minutes = padDatePart(date.getMinutes())

    return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const toUtcIsoString = (value) => {
    if (!value) return undefined

    const date = value instanceof Date ? value : new Date(value)

    if (Number.isNaN(date.getTime())) {
        return undefined
    }

    return date.toISOString()
}

export const toDateTimeLocalValue = (value) => {
    if (!value) return ""

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return ""
    }

    const timezoneOffset = date.getTimezoneOffset() * 60 * 1000
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

export const fromDateTimeLocalValue = (value) => {
    if (!value) return undefined

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return undefined
    }

    return date.toISOString()
}
