import { Link } from "react-router-dom"
import { Home, ArrowLeft, Search, AlertTriangle, BookOpen } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center">
                {/* 404 Illustration */}
                <div className="mb-8">
                    <div className="relative">
                        <div className="text-9xl font-bold text-gray-200 select-none">
                            404
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                <Search className="w-12 h-12 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 mb-8">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-600" />
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Page Not Found
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                        Oops! The page you're looking for seems to have wandered
                        off into the digital void. Don't worry, it happens to
                        the best of us.
                    </p>

                    {/* Suggestions */}
                    <div className="bg-blue-50 rounded-2xl p-6 mb-8">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 mr-2" />
                            Here's what you can do:
                        </h3>
                        <div className="space-y-3 text-blue-800">
                            <p className="flex items-center justify-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                Check the URL for any typos
                            </p>
                            <p className="flex items-center justify-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                Go back to the previous page
                            </p>
                            <p className="flex items-center justify-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                Visit our dashboard to find what you need
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={() => window.history.back()}
                            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-medium"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Go Back</span>
                        </button>

                        <Link to="/dashboard">
                            <button className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium">
                                <Home className="w-5 h-5" />
                                <span>Go to Dashboard</span>
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Fun Fact */}
                <div className="text-gray-500 text-sm">
                    <p>
                        Fun fact: HTTP 404 errors were named after room 404 at
                        CERN, where the web was born! 🌐
                    </p>
                </div>
            </div>
        </div>
    )
}
