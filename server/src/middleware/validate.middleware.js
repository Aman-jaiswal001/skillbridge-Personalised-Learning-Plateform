export function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    })
    if (!parsed.success) {
      parsed.error.statusCode = 422
      parsed.error.message = 'Validation failed'
      return next(parsed.error)
    }
    req.validated = parsed.data
    if (parsed.data.body) req.body = parsed.data.body
    next()
  }
}
