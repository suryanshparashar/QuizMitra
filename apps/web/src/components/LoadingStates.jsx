/**
 * Reusable Skeleton / Spinner loading components
 * Based on QuizMitra Design System Document §5.8
 */

/**
 * Skeleton — Shimmering placeholder block.
 * Uses the `.skeleton` CSS class from index.css.
 *
 * @param {string}  [className]  — Extra Tailwind/CSS classes
 * @param {string}  [width]      — CSS width   (default: "100%")
 * @param {string}  [height]     — CSS height  (default: "1rem")
 * @param {boolean} [circle]     — Circular shape (avatar placeholder)
 */
export function Skeleton({
    className = "",
    width = "100%",
    height = "1rem",
    circle = false,
}) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{
                width,
                height,
                borderRadius: circle ? "50%" : undefined,
            }}
        />
    )
}

/**
 * SkeletonCard — Full card placeholder.
 */
export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <Skeleton height="1.25rem" width="60%" />
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    height="0.875rem"
                    width={i === lines - 1 ? "40%" : "90%"}
                />
            ))}
        </div>
    )
}

/**
 * DashboardSkeleton — Full-page dashboard skeleton.
 */
export function DashboardSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-8 space-y-8 animate-pulse">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton height="3rem" width="3rem" circle />
                            <Skeleton height="0.75rem" width="3rem" />
                        </div>
                        <Skeleton height="2rem" width="50%" className="mb-2" />
                        <Skeleton height="0.75rem" width="70%" />
                    </div>
                ))}
            </div>

            {/* Content Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SkeletonCard lines={5} />
                </div>
                <div>
                    <SkeletonCard lines={4} />
                </div>
            </div>

            {/* Chart */}
            <SkeletonCard lines={0}>
                <Skeleton height="16rem" />
            </SkeletonCard>
        </div>
    )
}

/**
 * Spinner — Animated loading spinner.
 * Sizes: sm (24px), md (40px), lg (64px)
 *
 * @param {"sm"|"md"|"lg"} [size]
 * @param {string}         [className]
 */
export function Spinner({ size = "md", className = "" }) {
    const sizeMap = { sm: "h-6 w-6", md: "h-10 w-10", lg: "h-16 w-16" }
    const borderMap = { sm: "border-2", md: "border-3", lg: "border-4" }

    return (
        <div
            className={`animate-spin rounded-full ${sizeMap[size]} ${borderMap[size]} border-gray-200 border-t-primary-600 ${className}`}
        />
    )
}

/**
 * FullPageSpinner — Centered spinner with message.
 */
export function FullPageSpinner({ message = "Loading..." }) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
                <Spinner size="lg" />
                <p className="text-gray-600 font-medium">{message}</p>
            </div>
        </div>
    )
}
