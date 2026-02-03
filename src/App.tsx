import { PainelLojaPage } from "@/pages/Dashboard";
import { Toaster } from "@/components/ui/toaster";

import { PrivacyPolicy } from "@/pages/PrivacyPolicy";

function App() {
    const isPrivacyPolicy = window.location.pathname === '/privacidade';

    if (isPrivacyPolicy) {
        return <PrivacyPolicy />;
    }

    return (
        <>
            <PainelLojaPage />
            <Toaster />
        </>
    );
}

export default App;
