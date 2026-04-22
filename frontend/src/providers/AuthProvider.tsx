import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";
import { Loader } from "lucide-react";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        const interceptor = axiosInstance.interceptors.request.use(async (config) => {
            // Never attach token to public endpoints
            if (config.url?.includes('/auth/callback')) {
                return config;
            }

            if (isAuthenticated) {
                try {
                    const token = await getAccessTokenSilently({
                        authorizationParams: {
                            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                        }
                    });
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                        console.log('Token attached for:', config.url);
                    }
                } catch (error) {
                    console.error('Failed to get token:', error);
                }
            } else {
                console.warn('Not authenticated, skipping token for:', config.url);
            }
            return config;
        });

        setReady(true);

        return () => axiosInstance.interceptors.request.eject(interceptor);
    }, [isLoading, isAuthenticated, getAccessTokenSilently]);

    if (!ready || isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center">
                <Loader className="size-8 animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthProvider;