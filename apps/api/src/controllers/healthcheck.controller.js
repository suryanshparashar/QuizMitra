import { ApiResponse, asyncHandler } from "../utils/index.js"

const healthcheck = asyncHandler(async (req, res) => {
    console.log(req?.protocol + "://" + req?.get("host") + req?.originalUrl)

    return res
        .status(200)
        .json(new ApiResponse(200, "OK", "Health check passed"))
})

export { healthcheck }
