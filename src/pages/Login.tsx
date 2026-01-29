

import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg border border-gray-200">
                <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">Login</h1>
                <p className="mb-6 text-gray-500 text-sm">Bem-vindo ao Painel Estrela iPhones.</p>

                <Button
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-black hover:bg-gray-800 text-white"
                >
                    Entrar no Painel
                </Button>

                <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button
                        variant="link"
                        onClick={() => navigate('/privacidade')}
                        className="w-full text-xs text-gray-400"
                    >
                        Política de Privacidade
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Login;
