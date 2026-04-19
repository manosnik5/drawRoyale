import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";

const AuthCallbackPage = () => {
  const { user, isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const synced = useRef(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!isAuthenticated || !user || synced.current) return;

      synced.current = true;

      try {
        const token = await getAccessTokenSilently();

        await axiosInstance.post(
          "/auth/callback",
          {
            id: user.sub,
            firstName: user.given_name,
            lastName: user.family_name,
            imageUrl: user.picture,
            email: user.email,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (err) {
        console.error("sync failed:", err);
      } finally {
        navigate("/");
      }
    };

    syncUser();
  }, [isAuthenticated, user]);

  return <div>Logging you in...</div>;
};

export default AuthCallbackPage;