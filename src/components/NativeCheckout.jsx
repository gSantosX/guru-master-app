import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, Zap, ShieldCheck } from 'lucide-react';

// Stripe publishable key - in a real app this is loaded via ENV
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_PLACEHOLDER');

const CheckoutForm = ({ userEmail, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', // Do not auto redirect, keep user locally for SPA feel
      confirmParams: {
        payment_method_data: {
            billing_details: {
                email: userEmail
            }
        }
      }
    });

    if (error) {
      setErrorMessage(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setIsProcessing(false);
      onSuccess(paymentIntent);
    } else {
      setIsProcessing(false);
      // It might be 'requires_action' for PIX or 3D Secure
      setErrorMessage("Pagamento em processamento ou aguardando ação (PIX). Siga as instruções do banco.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <PaymentElement className="mb-6" />
      
      {errorMessage && (
        <div className="mb-4 text-neon-pink text-xs font-bold text-center bg-neon-pink/5 p-3 rounded-lg border border-neon-pink/20">
          {errorMessage}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full h-14 bg-neon-cyan text-black font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isProcessing ? 'Processando Blindagem...' : 'Autorizar e Liberar Acesso'}
        {!isProcessing && <Zap className="w-5 h-5" />}
      </button>

      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest text-gray-500">
         <Lock className="w-3 h-3" />
         Pagamento Criptografado & Seguro
      </div>
    </form>
  );
};

export const NativeCheckout = ({ userEmail, onVerificationSuccess }) => {
  const [clientSecret, setClientSecret] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Create PaymentIntent as soon as the component loads
    const fetchPaymentIntent = async () => {
      try {
        const res = await fetch('/api/create-payment', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail || "convidado@gurumaster.com.br" }),
        });
        
        if (res.ok) {
           const data = await res.json();
           setClientSecret(data.clientSecret);
        } else {
            console.error("Endpoint não encontrado (Executando via Vite Local). Você precisará usar Netlify/Vercel CLI ou mockar o token.");
            // MOCK FOR LOCAL DEV WHERE "/api" PROXY ISN'T RUNNING
            setClientSecret("pi_mocked_for_local_dev_secret_only");
        }
      } catch (err) {
         console.error("Falha ao comunicar com Serverless de Checkout:", err);
      }
    };
    fetchPaymentIntent();
  }, [userEmail]);

  const appearance = {
    theme: 'night',
    variables: {
      colorPrimary: '#00f3ff',
      colorBackground: '#12121c',
      colorText: '#ffffff',
      colorDanger: '#ff00f3',
      fontFamily: 'system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '12px',
    },
    rules: {
      '.Input': { border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid #00f3ff', boxShadow: '0 0 10px rgba(0,243,255,0.2)' }
    }
  };

  if (!clientSecret) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
         <div className="w-8 h-8 rounded-full border-t-2 border-neon-cyan animate-spin mb-4"></div>
         <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Inicializando Cofre Seguro...</p>
      </div>
    );
  }

  if (isSuccess) {
     return (
        <div className="w-full flex flex-col items-center justify-center py-10 bg-green-500/5 rounded-2xl border border-green-500/20 text-center">
            <ShieldCheck className="w-16 h-16 text-green-400 mb-4 animate-pulse" />
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">Autorização Confirmada</h3>
            <p className="text-sm text-gray-400 mb-8 max-w-sm">Sua licença vitalícia foi gerada com sucesso e amarrada ao seu e-mail.</p>
            <button 
              onClick={() => {
                if (onVerificationSuccess) onVerificationSuccess();
              }}
              className="px-8 py-3 bg-white/5 border border-white/10 hover:border-white/30 text-white font-bold rounded-xl truncate"
            >
               Prosseguir para o Download
            </button>
        </div>
     );
  }

  // Se mock pass, renderizar o visual sem erro
  if (clientSecret.includes('mocked')) {
      return (
         <div className="w-full flex flex-col bg-[#12121c] p-6 md:p-8 rounded-3xl border border-white/5">
            <h3 className="text-xl font-black text-white mb-6">Informações de Cobrança</h3>
            <div className="px-6 py-10 border border-dashed border-white/10 rounded-2xl text-center flex flex-col items-center">
               <ShieldCheck className="w-12 h-12 text-gray-600 mb-2" />
               <p className="text-xs text-gray-500 max-w-xs font-mono">Simulador Local Ativo. O componente real de Cartão/PIX da Stripe será renderizado aqui 100% nativo quando as chaves secretas forem ativadas no arquivo `.env`.</p>
               <button 
                 onClick={() => setIsSuccess(true)}
                 className="mt-6 px-6 py-2 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan text-xs font-bold rounded-full cursor-pointer hover:bg-neon-cyan/30"
               >
                 Simular Pagamento Aprovado
               </button>
            </div>
         </div>
      );
  }

  return (
    <div className="w-full bg-[#12121c] p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
       {/* Ambient Light */}
       <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-neon-cyan/20 blur-2xl"></div>
       
       <h3 className="text-xl font-black text-white mb-6 flex items-center justify-between">
         Segurança do Plano
         <span className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-full font-mono text-gray-400 font-normal">
           R$ 29,90
         </span>
       </h3>

       <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
         <CheckoutForm userEmail={userEmail} onSuccess={() => setIsSuccess(true)} />
       </Elements>
    </div>
  );
};
