import { useAuth0 } from "@auth0/auth0-react";

const SignInOAuthButton = () => {
    const { loginWithRedirect, isAuthenticated } = useAuth0();

    if (isAuthenticated) return null;

    return (
        <button
            onClick={() => loginWithRedirect()}
            className="px-4 py-3 bg-black text-white"
        >
            Continue with Google / Auth0
        </button>
    );
};

export default SignInOAuthButton;