import { ShieldCheck, HelpCircle, Printer } from 'lucide-react';

export function PrivacyPolicy() {
    return (
        <div className="bg-[#000000] text-white antialiased min-h-screen flex flex-col selection:bg-[#D4AF37] selection:text-black font-sans">
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                body { font-family: 'Inter', sans-serif; }
                
                .glass-nav {
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }

                .glass-panel {
                    background: rgba(21, 21, 22, 0.6);
                    backdrop-filter: blur(40px);
                    -webkit-backdrop-filter: blur(40px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                
                .prose-custom h3 {
                    color: #F5F5F7;
                    font-weight: 600;
                    font-size: 1.25rem;
                    margin-top: 2.5rem;
                    margin-bottom: 1rem;
                    letter-spacing: -0.01em;
                }

                .prose-custom p {
                    color: #A1A1A6;
                    line-height: 1.7;
                    margin-bottom: 1.5rem;
                    font-size: 1.05rem;
                }

                .prose-custom ul, .prose-custom ol {
                    color: #A1A1A6;
                    margin-bottom: 1.5rem;
                    padding-left: 1.5rem;
                }
                
                .prose-custom li {
                    margin-bottom: 0.5rem;
                    line-height: 1.6;
                }

                .prose-custom strong {
                    color: #D4AF37;
                    font-weight: 600;
                }

                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #000;
                }
                ::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #D4AF37;
                }
            `}} />

            {/* Navbar Minimalista */}
            <nav className="fixed w-full z-50 glass-nav transition-all duration-300">
                <div className="max-w-5xl mx-auto px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E6C87C] to-[#B4942B] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                                <ShieldCheck className="text-black w-5 h-5" />
                            </div>
                            <span className="text-lg font-semibold tracking-tight text-white">STAR <span className="text-[#D4AF37]">TECH</span></span>
                        </div>

                        {/* Right Action */}
                        <div>
                            <a href="mailto:cainaestrela777@gmail.com" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                                <HelpCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Precisa de ajuda?</span>
                            </a>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
                {/* Background Glow FX */}
                <div className="absolute top-0 left-0 right-0 h-[800px] pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, #D4AF3715 0%, transparent 50%)' }}></div>

                <div className="max-w-3xl mx-auto relative z-10">
                    {/* Header do Documento */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-medium mb-6 uppercase tracking-wider">
                            Jurídico & Compliance
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
                            Política de Privacidade
                        </h1>
                        <p className="text-lg text-[#86868b] max-w-xl mx-auto">
                            Nosso compromisso com a transparência e a segurança dos seus dados pessoais.
                        </p>
                    </div>

                    {/* Container do Texto (Glass Panel) */}
                    <div className="glass-panel rounded-3xl p-8 md:p-12">
                        <div className="prose-custom">

                            <p className="text-sm text-gray-500 mb-8 border-b border-white/10 pb-4">
                                Última atualização: <strong>14 de janeiro de 2026</strong>
                            </p>

                            <p>
                                A <strong>STAR TECH LTDA</strong> (“nós”, “a Empresa”) valoriza a privacidade de seus clientes e usuários. Esta Política de Privacidade descreve como coletamos, usamos, processamos e divulgamos suas informações, em conjunto com o seu acesso e uso de nossa integração de atendimento via Instagram e Facebook, em conformidade com a Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018) e as políticas de desenvolvedor da Meta.
                            </p>

                            <h3>1. Quem somos e como nos contatar</h3>
                            <p>
                                <strong>Controladora:</strong> STAR TECH LTDA<br />
                                <strong>CNPJ:</strong> 57.402.033/0001-85<br />
                                <strong>Endereço:</strong> Rua Padre Casimiro Quiroga, 236 - Imbuí, Salvador - BA, 41720-400<br />
                                <strong>E-mail para privacidade:</strong> cainaestrela777@gmail.com<br />
                                <strong>Telefone:</strong> (71) 99355-8983
                            </p>
                            <p>
                                <strong>Abrangência:</strong> Esta política aplica-se especificamente ao tratamento de dados provenientes das interações via Mensagens Diretas (Instagram Direct e Facebook Messenger) gerenciadas através de nossos sistemas internos de atendimento.
                            </p>

                            <h3>2. Dados que coletamos</h3>
                            <p>Para viabilizar o atendimento ao cliente em nossa assistência técnica especializada em iPhone e loja de acessórios, nosso aplicativo no Facebook acessa as seguintes informações quando você entra em contato conosco:</p>
                            <ul className="list-disc">
                                <li><strong>Informações de Perfil Público:</strong> Nome de usuário (Username), ID do usuário no Instagram/Facebook e Foto de perfil.</li>
                                <li><strong>Conteúdo das Mensagens:</strong> O texto, imagens, áudios ou anexos enviados por você através do Direct do Instagram ou Messenger para a nossa página comercial.</li>
                                <li><strong>Metadados:</strong> Horário da mensagem e status de leitura.</li>
                            </ul>
                            <p className="text-sm italic border-l-2 border-[#D4AF37] pl-4 py-2 bg-white/5 rounded-r-lg">
                                Importante: Não coletamos senhas, dados bancários ou informações sensíveis através desta integração, a menos que você os forneça voluntariamente no corpo da conversa.
                            </p>

                            <h3>3. Finalidade do tratamento</h3>
                            <p>Utilizamos os dados coletados exclusivamente para:</p>
                            <ol className="list-decimal marker:text-[#D4AF37]">
                                <li><strong>Centralização de Atendimento:</strong> Receber e responder suas dúvidas sobre consertos, orçamentos técnicos e venda de acessórios através de nossa plataforma de gestão de mensagens.</li>
                                <li><strong>Histórico de Suporte:</strong> Manter um registro do seu atendimento para consultas futuras, validação de garantias e continuidade do serviço prestado.</li>
                                <li><strong>Melhoria do Serviço:</strong> Analisar métricas de tempo de resposta e qualidade do atendimento da nossa equipe técnica.</li>
                            </ol>

                            <h3>4. Compartilhamento de dados</h3>
                            <p>Para operar nosso atendimento digital, compartilhamos os dados estritamente necessários com:</p>
                            <ul className="list-disc">
                                <li><strong>Provedores de Tecnologia:</strong> Fornecedores de software de Helpdesk e CRM que utilizamos para operacionalizar e armazenar o fluxo de mensagens.</li>
                                <li><strong>Meta Platforms, Inc.:</strong> Provedor da plataforma de origem das mensagens.</li>
                                <li><strong>Autoridades Públicas:</strong> Apenas quando exigido por lei ou ordem judicial válida.</li>
                            </ul>
                            <p><strong>Não vendemos nem compartilhamos</strong> seus dados de conversas com terceiros para fins de marketing ou publicidade externa.</p>

                            <h3>5. Segurança da informação</h3>
                            <p>
                                As mensagens são transmitidas de forma criptografada (HTTPS) entre os servidores da Meta e nossos sistemas de gerenciamento. O acesso ao painel de atendimento é restrito aos funcionários autorizados da STAR TECH LTDA e protegido por autenticação.
                            </p>

                            <h3>6. Retenção e Exclusão de Dados (Data Deletion)</h3>
                            <p>
                                Manteremos o histórico das conversas pelo tempo necessário para cumprir as finalidades de atendimento ao cliente e obrigações legais (como garantia legal de serviços de assistência técnica).
                            </p>
                            <p><strong>Como solicitar a exclusão dos seus dados:</strong></p>
                            <p>De acordo com as regras do Facebook e a LGPD, você tem o direito de solicitar a exclusão de seus dados. Para isso:</p>
                            <ol className="list-decimal marker:text-[#D4AF37]">
                                <li>Envie um e-mail para <a href="mailto:cainaestrela777@gmail.com" className="text-[#D4AF37] hover:underline">cainaestrela777@gmail.com</a> com o assunto "Exclusão de Dados".</li>
                                <li>Informe seu nome de usuário do Instagram ou Facebook.</li>
                            </ol>
                            <p>
                                Nós removeremos seu histórico de conversas de nossos sistemas em até 72 horas úteis após a confirmação da identidade, salvo se houver obrigação legal de retenção.
                            </p>

                            <h3>7. Seus Direitos (LGPD)</h3>
                            <p>
                                Como titular dos dados, você pode solicitar a qualquer momento: confirmação e acesso aos dados; correção de dados incompletos ou inexatos; e revogação do consentimento para processamento futuro.
                            </p>

                            <h3>8. Alterações nesta política</h3>
                            <p>
                                Podemos atualizar esta Política para refletir mudanças em processos, tecnologias ou requisitos legais. A versão atualizada estará sempre disponível neste mesmo link.
                            </p>
                        </div>
                    </div>

                    {/* Print / Contact Actions */}
                    <div className="mt-8 flex justify-center gap-4">
                        <button onClick={() => window.print()} className="flex items-center text-gray-400 hover:text-white transition-colors text-sm font-medium">
                            <Printer className="w-4 h-4 mr-2" /> Imprimir documento
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer Minimalista */}
            <footer className="bg-black border-t border-white/10 py-12">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-[#86868b] text-xs mb-4">
                        CNPJ: 57.402.033/0001-85 • Salvador, Bahia, Brasil
                    </p>
                    <p className="text-gray-600 text-xs">
                        &copy; 2026 STAR TECH LTDA. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}
