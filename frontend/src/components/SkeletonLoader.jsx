// Reusable Skeleton Loading Components
export const SkeletonCard = ({ count = 1 }) => (
    <>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
                <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
        ))}
    </>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            ))}
        </div>
    </div>
);

export const SkeletonEventCard = ({ count = 3 }) => (
    <>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="space-y-3 mb-4">
                    <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                    <div className="space-y-1">
                        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                    <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
            </div>
        ))}
    </>
);

export const SkeletonText = ({ lines = 1, width = 'w-full' }) => (
    <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className={`h-4 ${width} bg-slate-200 dark:bg-slate-700 rounded animate-pulse`}></div>
        ))}
    </div>
);

export const PageLoader = ({ message = 'Loading...' }) => (
    <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-brand-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-slate-600 dark:text-slate-400 font-medium mt-4">{message}</p>
    </div>
);
