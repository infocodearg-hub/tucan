import React, { useState } from 'react';
import { 
  CreditCard, 
  Wallet, 
  DollarSign, 
  ArrowUpRight, 
  ShieldCheck, 
  TrendingUp, 
  Lock, 
  CheckCircle2,
  RefreshCw,
  Building2
} from 'lucide-react';

export function PaymentsView({ balance, setBalance, userRole }) {
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositMethod, setDepositMethod] = useState('usdt');
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Model Earnings Simulation state
  const [modelEarnings] = useState({
    totalEarned: 1450.00,
    subscriptionsEarned: 620.00,
    ppvEarned: 480.00,
    datesEarned: 350.00,
    pendingPayout: 1120.00
  });

  const handleSimulateDeposit = (e) => {
    e.preventDefault();
    setBalance(prev => prev + parseFloat(depositAmount));
    setDepositSuccess(true);
    setTimeout(() => setDepositSuccess(false), 2500);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>
          {userRole === 'client' ? 'Gestión de Saldo y Carga de Créditos' : 'Centro de Cobros y Liquidaciones de Modelo'}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Pasarelas especializadas de alto riesgo (High-Risk Merchant Accounts) y Criptomonedas (USDT/Cripto) para máxima privacidad y cobrabilidad global.
        </p>
      </div>

      {userRole === 'client' ? (
        /* Client Deposit View */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Deposit Form */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399' }}>
              <Wallet size={20} /> Cargar Saldo / Créditos
            </h3>

            {depositSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#34d399',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={18} /> ¡Carga acreditada instantáneamente! Saldo actual: ${balance.toFixed(2)} USDT
              </div>
            )}

            <form onSubmit={handleSimulateDeposit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Seleccione el monto a cargar:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[20, 50, 100, 200].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setDepositAmount(amt)}
                      className={depositAmount === amt ? 'btn-primary' : 'btn-secondary'}
                      style={{ padding: '0.5rem', justifyContent: 'center', fontSize: '0.85rem' }}
                    >
                      ${amt} USDT
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Método de Pago Seguro:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: depositMethod === 'usdt' ? '1px solid #ec4899' : '1px solid var(--border-light)',
                    background: depositMethod === 'usdt' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer'
                  }}>
                    <input type="radio" name="method" checked={depositMethod === 'usdt'} onChange={() => setDepositMethod('usdt')} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Criptomonedas (USDT TRC20 / Binance Pay)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin restricciones bancarias • Acreditación instantánea</div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: depositMethod === 'ccbill' ? '1px solid #ec4899' : '1px solid var(--border-light)',
                    background: depositMethod === 'ccbill' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer'
                  }}>
                    <input type="radio" name="method" checked={depositMethod === 'ccbill'} onChange={() => setDepositMethod('ccbill')} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>CCBill / Segpay (Tarjeta Internacional Visa/Mastercard)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Procesamiento discreto y seguro de alto riesgo</div>
                    </div>
                  </label>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                Simular Carga de ${depositAmount} USDT
              </button>
            </form>
          </div>

          {/* Balance Breakdown & Discretion Notice */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saldo Disponible para Compras / Citas</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399', margin: '0.2rem 0' }}>
                ${balance.toFixed(2)} <span style={{ fontSize: '1rem' }}>USDT</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Equivalente a <strong>{(balance * 10).toFixed(0)} créditos</strong> de la plataforma.
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f472b6' }}>
                <Lock size={16} /> Resumen Bancario 100% Discreto
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                En los resúmenes de tarjeta de crédito (vía CCBill o Segpay), el cargo figurará bajo una razón social neutra (ej: <code>SERVICES INTERACTIVE DIG 800-555</code>) preservando la privacidad total del comprador.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Creator Dashboard Payouts View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Earnings Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            <div className="glass-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ganancias Totales Acumuladas</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f472b6', margin: '0.3rem 0' }}>
                ${modelEarnings.totalEarned.toFixed(2)} USDT
              </div>
              <div style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                <TrendingUp size={14} /> +18.4% este mes
              </div>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pendiente de Retiro</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', margin: '0.3rem 0' }}>
                ${modelEarnings.pendingPayout.toFixed(2)} USDT
              </div>
              <button className="btn-accent" style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                Solicitar Retiro
              </button>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desglose por Fuente</div>
              <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div>• Suscripciones: <strong>${modelEarnings.subscriptionsEarned}</strong></div>
                <div>• Contenido PPV: <strong>${modelEarnings.ppvEarned}</strong></div>
                <div>• Citas Virtuales 1a1: <strong>${modelEarnings.datesEarned}</strong></div>
              </div>
            </div>
          </div>

          {/* Payout Methods for Creators */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={20} color="#ec4899" /> Métodos de Retiro Habilitados para Creadores
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#34d399' }}>
                  Criptomonedas (USDT TRC20)
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Cobro instantáneo a tu billetera personal (Binance, Lemon, Buenbit). Sin comisiones bancarias.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#60a5fa' }}>
                  Paxum / Cosmo Payment
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Monederos electrónicos globales estándar de la industria erótica con tarjeta de débito asociada.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: '#fbbf24' }}>
                  Transferencia SWIFT / CBU
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Directo a tu cuenta bancaria en Argentina. Emisión de comprobantes para Monotributo/ARCA.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
