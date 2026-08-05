import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count):
        self.saveState()

        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 7.5)
            self.setFillColor(colors.HexColor("#9f1239"))
            self.drawString(40, 11 * inch - 26, "INFORME LEGAL, TÉCNICO Y ESTRATÉGICO | PLATAFORMA ADULTOS & ACOMPAÑAMIENTO VIRTUAL")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(40, 11 * inch - 30, 8.5 * inch - 40, 11 * inch - 30)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(40, 22, "DOCUMENTO CONFIDENCIAL - PREPARADO PARA CLIENTE")
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(8.5 * inch - 40, 22, page_text)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(40, 32, 8.5 * inch - 40, 32)

        self.restoreState()


def create_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=38,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    primary_color   = colors.HexColor("#881337")
    secondary_color = colors.HexColor("#1e293b")
    accent_color    = colors.HexColor("#e11d48")
    text_dark       = colors.HexColor("#0f172a")
    bg_light        = colors.HexColor("#f8fafc")
    box_bg          = colors.HexColor("#fff1f2")

    title_style = ParagraphStyle('CoverTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=20, leading=24,
        textColor=primary_color, spaceAfter=3)

    subtitle_style = ParagraphStyle('CoverSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=10.5, leading=14,
        textColor=secondary_color, spaceAfter=8)

    h1_style = ParagraphStyle('CustomH1', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=12.5, leading=15,
        textColor=primary_color, spaceBefore=9, spaceAfter=3, keepWithNext=True)

    h2_style = ParagraphStyle('CustomH2', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=9.5, leading=12,
        textColor=secondary_color, spaceBefore=6, spaceAfter=2, keepWithNext=True)

    body_style = ParagraphStyle('CustomBody', parent=styles['BodyText'],
        fontName='Helvetica', fontSize=8.5, leading=12,
        textColor=text_dark, spaceAfter=3)

    bullet_style = ParagraphStyle('CustomBullet', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.25, leading=11.5,
        textColor=text_dark, leftIndent=10, spaceAfter=2)

    callout_style = ParagraphStyle('CalloutText', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=11,
        textColor=colors.HexColor("#991b1b"))

    table_header_style = ParagraphStyle('TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8.5, leading=10.5,
        textColor=colors.white, alignment=1)

    table_cell_style = ParagraphStyle('TableCell', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=10.5, textColor=text_dark)

    story = []
    PW = 532  # page content width

    # ─── COVER ──────────────────────────────────────────────────────────────
    story.append(Paragraph("INFORME ESTRATÉGICO Y MARCO LEGAL INTEGRAL", title_style))
    story.append(Paragraph("Desarrollo de Plataforma Web de Contenido para Adultos, Suscripciones y Acompañamiento Virtual 1a1 (Novios/as Virtuales)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=accent_color, spaceAfter=6, spaceBefore=1))

    cover_meta = [
        [Paragraph("<b>Destinatario:</b> Cliente / Equipo Directivo", body_style), Paragraph("<b>Fecha:</b> Agosto 2026", body_style)],
        [Paragraph("<b>Ámbito Legal:</b> Argentina e Internacional (EE.UU. / UE)", body_style), Paragraph("<b>Versión:</b> 2.0 Final Consolidada", body_style)],
        [Paragraph("<b>Estado:</b> Documento Ejecutivo Confidencial", body_style), Paragraph("<b>Modelo:</b> Suscripciones, PPV & WebRTC 1a1", body_style)]
    ]
    t_meta = Table(cover_meta, colWidths=[266, 266])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('PADDING',    (0,0), (-1,-1), 5),
        ('BOX',        (0,0), (-1,-1), 0.75, colors.HexColor("#cbd5e1")),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 5))

    abstract_text = (
        "<b>RESUMEN EJECUTIVO:</b> Este documento consolida el análisis exhaustivo legal, técnico y financiero para la creación "
        "de una plataforma de contenido para adultos y acompañamiento virtual. Aborda el marco regulatorio en Argentina (Ley Olimpia, "
        "Ley de Protección de Datos Personales, Código Penal) e Internacional (US 18 U.S.C. § 2257, Normas Mastercard/Visa, GDPR), "
        "el esquema de verificación KYC/Age Assurance, la arquitectura de pasarelas de pago de alto riesgo (evitando bloqueos bancarios) "
        "y el plan de acción paso a paso para ejecutar el proyecto con total seguridad jurídica y solvencia técnica."
    )
    t_box = Table([[Paragraph(abstract_text, callout_style)]], colWidths=[PW])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), box_bg),
        ('PADDING',    (0,0), (-1,-1), 7),
        ('BOX',        (0,0), (-1,-1), 1, colors.HexColor("#f43f5e")),
    ]))
    story.append(t_box)

    # ─── SECCIÓN 1 ───────────────────────────────────────────────────────────
    story.append(Paragraph("1. Alcance de la Plataforma y Modelo de Negocio", h1_style))
    story.append(Paragraph(
        "El proyecto contempla el desarrollo de una plataforma web (PWA - Progressive Web App) tipo red social de economía "
        "de creadores, inspirada en modelos como OnlyFans, Fansly y Cafecito, extendida hacia la interacción en tiempo real "
        "y el acompañamiento virtual casual. La plataforma abre el acceso a todas las identidades y géneros (mujeres, hombres, "
        "colectivo LGBTQ+), siempre dentro de los márgenes legales vigentes.", body_style))

    features_data = [
        [Paragraph("Módulo", table_header_style), Paragraph("Descripción Operativa", table_header_style), Paragraph("Modelo de Monetización", table_header_style)],
        [Paragraph("<b>Suscripciones por Niveles</b>", table_cell_style), Paragraph("Acceso a feed exclusivo de fotos/videos del creador por planes mensuales con beneficios escalonados.", table_cell_style), Paragraph("Cobro recurrente mensual ($5 - $50 USDT)", table_cell_style)],
        [Paragraph("<b>Pay-Per-View (PPV)</b>", table_cell_style), Paragraph("Publicaciones o mensajes privados bloqueados que se desbloquean individualmente con un pago único.", table_cell_style), Paragraph("Pago único por desbloqueo ($2 - $20 USDT)", table_cell_style)],
        [Paragraph("<b>Citas Virtuales 1a1</b>", table_cell_style), Paragraph("Videollamadas WebRTC en tiempo real para encuentros virtuales casuales (Novios/as Virtuales) o streaming privado.", table_cell_style), Paragraph("Tarifado por minuto (Pay-Per-Minute)", table_cell_style)],
        [Paragraph("<b>Propinas y Mensajería</b>", table_cell_style), Paragraph("Envío de mensajes prioritarios, notas de voz personalizadas, regalos digitales y pedidos de contenido a medida.", table_cell_style), Paragraph("Micropagos directos / Créditos de plataforma", table_cell_style)]
    ]
    t_feat = Table(features_data, colWidths=[118, 262, 152])
    t_feat.setStyle(TableStyle([
        ('BACKGROUND',   (0,0), (-1,0), primary_color),
        ('ALIGN',        (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('GRID',         (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING',      (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_feat)

    # ─── SECCIÓN 2 ───────────────────────────────────────────────────────────
    story.append(Paragraph("2. Marco Legal Local (Argentina)", h1_style))
    story.append(Paragraph(
        "Para operar de manera 100% legal desde o hacia la República Argentina, la plataforma debe alinearse estrictamente "
        "con el cuerpo normativo vigente. Cada uno de los pilares detallados a continuación debe implementarse en el código, "
        "en los contratos y en los protocolos operativos de moderación desde el primer día:", body_style))

    story.append(Paragraph("• <b>Ley Olimpia (Ley 27.736):</b> Incorpora la <i>violencia digital</i> como modalidad de violencia de género. Obliga a la plataforma a disponer de un canal expedito de reporte y baja inmediata (máximo 24h) de cualquier contenido íntimo subido sin consentimiento explícito del titular.", bullet_style))
    story.append(Paragraph("• <b>Protección de Datos Personales (Ley 25.326):</b> La información sobre orientación o actividad erótica es legalmente un <i>dato sensible</i>. Requiere: (a) consentimiento libre, expreso e informado; (b) inscripción ante la AAIP; (c) cifrado E2EE de datos almacenados.", bullet_style))
    story.append(Paragraph("• <b>Código Penal de la Nación (Art. 128 / Art. 125 bis):</b> Tolerancia cero frente a material de abuso sexual infantil (CSAM), coerción o facilitación de trata de personas. La plataforma debe integrar firmas digitales PhotoDNA / NCMEC para auditoría automatizada y reporte inmediato.", bullet_style))
    story.append(Paragraph("• <b>Propiedad Intelectual (Ley 11.723):</b> El creador retiene la titularidad absoluta de su obra. La plataforma opera bajo un contrato de <i>licencia de uso no exclusiva, limitada en tiempo y revocable</i>, estipulada en los Términos y Condiciones aceptados al momento del registro.", bullet_style))
    story.append(Paragraph("• <b>Aspectos Impositivos (ARCA / AFIP):</b> Los ingresos de creadores argentinos se encuadran bajo Monotributo (Categoría Exportación de Servicios) o Responsable Inscripto. La plataforma generará resúmenes de retención/comisión mensuales en PDF/CSV para la rendición impositiva.", bullet_style))
    story.append(Paragraph("• <b>Habeas Data (Art. 43 CN):</b> Toda persona tiene derecho a acceder, rectificar o suprimir sus datos personales. La plataforma debe ofrecer un panel de usuario que permita la eliminación total de datos a solicitud, dentro de los 30 días hábiles.", bullet_style))

    # ─── SECCIÓN 3 ───────────────────────────────────────────────────────────
    story.append(Paragraph("3. Marco Legal — Regulaciones Internacionales", h1_style))
    story.append(Paragraph(
        "Si la plataforma acepta usuarios o procesa pagos fuera de Argentina (EE.UU., Europa, LATAM), debe cumplir "
        "de forma simultánea con los siguientes marcos regulatorios internacionales, exigidos además como requisito "
        "ineludible por las redes de pago y los proveedores de nube:", body_style))

    story.append(Paragraph("• <b>US 18 U.S.C. § 2257 (Registro de Intérpretes — EE.UU.):</b> Exige custodiar durante mínimo 7 años: copia del documento de identidad oficial de cada modelo, fecha de nacimiento confirmada, nombres artísticos/pseudónimos y fechas de producción/publicación del contenido.", bullet_style))
    story.append(Paragraph("• <b>Mastercard Revised Standards (AN 4480 / GLB 13267) & Visa Adult Rules:</b> Obligan a: (a) verificación biométrica real de identidad —prohibido el simple botón 'soy mayor de 18'—; (b) pre-moderación activa de todos los archivos subidos; (c) <b>prohibición absoluta de comercializar Deepfakes / contenido sintético por IA</b> sin consentimiento previo firmado.", bullet_style))
    story.append(Paragraph("• <b>GDPR (Unión Europea) y UK Online Safety Act:</b> Exigen mecanismos de Age Assurance robustos, derecho al olvido (supresión de datos en 72h), canal de reclamos transparente y reporte obligatorio a la autoridad de control ante brechas de seguridad.", bullet_style))
    story.append(Paragraph("• <b>COPPA (EE.UU.) y Directiva de Menores (UE):</b> Prohibición total de registro de usuarios menores de 18 años. La verificación de edad debe ser efectiva (documental o biométrica), no declarativa.", bullet_style))

    # ─── SECCIÓN 4 ───────────────────────────────────────────────────────────
    story.append(Paragraph("4. Sistema de Verificación KYC y Age Assurance", h1_style))
    story.append(Paragraph(
        "Se implementará un motor de verificación en dos capas distintas según el rol del usuario. "
        "El proceso es obligatorio y bloquea el acceso a funciones de monetización o visualización de contenido explícito "
        "hasta su aprobación:", body_style))

    kyc_data = [
        [Paragraph("Rol", table_header_style), Paragraph("Proceso de Verificación Exigido", table_header_style), Paragraph("Tecnología / Proveedor", table_header_style)],
        [Paragraph("<b>Modelo / Creador</b>", table_cell_style),
         Paragraph("<b>KYC Completo:</b> (1) Carga del DNI/Pasaporte frente y dorso; (2) Selfie biométrica con detección de vida en tiempo real (Liveness Detection) para prevenir uso de fotos o generaciones IA; (3) Firma digital del Formulario 2257 y del acuerdo de la Ley Olimpia; (4) Validación de datos de cobro.", table_cell_style),
         Paragraph("Sumsub / Veriff / Persona (SDK integrado). Validación automatizada con revisión manual en casos dudosos.", table_cell_style)],
        [Paragraph("<b>Cliente / Comprador</b>", table_cell_style),
         Paragraph("<b>Age Assurance:</b> Verificación de mayoría de edad (18+) mediante tarjeta de crédito válida (titular registrado) o escaneo documental ligero. Sin verificación aprobada, el acceso a contenido PPV o citas queda bloqueado.", table_cell_style),
         Paragraph("Yoti Age Verification / validación automática por pasarela de pago.", table_cell_style)]
    ]
    t_kyc = Table(kyc_data, colWidths=[100, 278, 154])
    t_kyc.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), primary_color),
        ('ALIGN',         (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('GRID',          (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING',       (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_kyc)

    # ─── SECCIÓN 5 ───────────────────────────────────────────────────────────
    story.append(Paragraph("5. Arquitectura Financiera y Pasarelas de Pago", h1_style))

    warn_text = (
        "<b>ADVERTENCIA FINANCIERA CRÍTICA:</b> Mercado Pago, Stripe, PayPal y todas las pasarelas generalistas "
        "prohíben explícitamente actividades vinculadas a contenido para adultos y servicios de compañía erótica. "
        "Intentar procesar cobros por estas vías provocará la congelación inmediata e irreversible de los fondos "
        "y la cancelación definitiva de las cuentas. NO deben utilizarse bajo ninguna circunstancia."
    )
    t_warn = Table([[Paragraph(warn_text, callout_style)]], colWidths=[PW])
    t_warn.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#fef2f2")),
        ('PADDING',    (0,0), (-1,-1), 6.5),
        ('BOX',        (0,0), (-1,-1), 1, colors.HexColor("#dc2626")),
    ]))
    story.append(t_warn)
    story.append(Spacer(1, 5))

    story.append(Paragraph("Soluciones de Cobro Aprobadas (High-Risk & Cripto):", h2_style))
    story.append(Paragraph("1. <b>Pasarelas Internacionales de Alto Riesgo:</b> Integración con <b>CCBill</b>, <b>Segpay</b> o <b>Epoch</b> para cobro global con Visa/Mastercard. Son estándar de la industria adulta y están alineadas con las normas de redes de pago. Los resúmenes bancarios de los clientes figurarán bajo razones sociales discretas y neutras.", bullet_style))
    story.append(Paragraph("2. <b>Criptomonedas (USDT TRC20 / BEP20 / Binance Pay):</b> Método primario recomendado: inmediato, privado, sin fricciones cambiarias ni cepo. Permite acreditación instantánea en la plataforma y retiro directo a billeteras personales (Binance, Lemon, Buenbit).", bullet_style))
    story.append(Paragraph("3. <b>Liquidación a Modelos:</b> Las ganancias de los creadores se transfieren vía <b>Paxum</b> o <b>Cosmo Payment</b> (monederos electrónicos industriales con tarjeta de débito asociada), transferencia SWIFT directa a CBU argentino, o P2P en USDT para máxima inmediatez.", bullet_style))
    story.append(Paragraph("4. <b>Comisión de Plataforma:</b> El modelo recomendado es retener entre el 15% y el 20% de cada transacción (suscripción, PPV, cita virtual y propina) como fee operativo de la plataforma, por debajo de los estándares de mercado (OnlyFans retiene 20%).", bullet_style))

    # ─── SECCIÓN 6 ───────────────────────────────────────────────────────────
    story.append(Paragraph("6. Seguridad Técnica y Protección Anti-Filtraciones", h1_style))
    story.append(Paragraph("El contenido de los creadores es el activo central de la plataforma. Se implementan múltiples capas de protección técnica y legal:", body_style))

    story.append(Paragraph("• <b>Marcas de Agua Dinámicas e Invisibles (Forensic Watermarking):</b> Cada imagen o video renderizado en la plataforma incluye un overlay dinámico con el ID único del comprador y timestamp. Ante cualquier filtración en redes, la fuente es identificable de inmediato.", bullet_style))
    story.append(Paragraph("• <b>Protección en Navegador (Canvas / DRM):</b> Bloqueo de atajos de captura de pantalla (PrintScreen, ShareScreen) y deshabilitación de descargas directas en la PWA móvil mediante políticas de seguridad del navegador.", bullet_style))
    story.append(Paragraph("• <b>Moderación Pre-Publicación con IA:</b> Integración con Hive AI para filtrado automatizado antes de la publicación. Detecta CSAM, deepfakes no consentidos y contenido violatorio antes de que llegue a la plataforma.", bullet_style))
    story.append(Paragraph("• <b>Canal DMCA y Baja Rápida:</b> Formulario automatizado de reclamo de derechos de autor para gestionar la remoción de contenidos filtrados en sitios de terceros, con trazabilidad legal completa.", bullet_style))
    story.append(Paragraph("• <b>Almacenamiento Cifrado y Firmado:</b> Archivos almacenados en AWS S3 con URLs firmadas de corta vida (CloudFront Signed URLs). Ningún contenido privado es accesible sin un token de sesión válido y activo.", bullet_style))

    # ─── SECCIÓN 7 ───────────────────────────────────────────────────────────
    story.append(Paragraph("7. Videollamadas y Encuentros Virtuales (WebRTC Pay-Per-Minute)", h1_style))
    story.append(Paragraph(
        "El módulo de citas virtuales 1a1 y 'Novios/as Virtuales' constituye el diferenciador principal frente a plataformas "
        "convencionales de suscripción. Opera sobre tecnología WebRTC con facturación en tiempo real:", body_style))

    story.append(Paragraph("• <b>Modalidades disponibles:</b> Cita casual / Acompañamiento virtual / Novio o Novia Virtual / Sesión privada de entretenimiento adulto.", bullet_style))
    story.append(Paragraph("• <b>Tarificación:</b> El modelo fija su tarifa por minuto ($1 a $5 USDT/min recomendado). El sistema descuenta el saldo del cliente en tiempo real. Si el balance se agota, la llamada se cierra automáticamente con 60 segundos de aviso previo.", bullet_style))
    story.append(Paragraph("• <b>Registro de Sesión:</b> Cada videollamada genera un registro encriptado de duración, monto cobrado, ID del modelo y del cliente, y timestamp. Estos logs se conservan cifrados por 90 días para eventuales reclamos o auditorías.", bullet_style))
    story.append(Paragraph("• <b>Streaming Seguro:</b> La señal WebRTC es E2EE (cifrado extremo a extremo). No se almacena el video de la llamada sin consentimiento explícito de ambas partes.", bullet_style))
    story.append(Paragraph("• <b>Cumplimiento 2257 en Tiempo Real:</b> Antes de iniciar cualquier sesión, el sistema verifica que tanto el modelo como el cliente tengan sus respectivas verificaciones KYC/Age Assurance activas y aprobadas.", bullet_style))

    # ─── SECCIÓN 8 ───────────────────────────────────────────────────────────
    story.append(Paragraph("8. Estructura Legal de la Entidad Operadora", h1_style))
    story.append(Paragraph(
        "Para poder contratar con procesadores de alto riesgo (CCBill, Segpay) y operar internacionalmente, "
        "se recomienda constituir la entidad legal antes del desarrollo. Las opciones más utilizadas son:", body_style))

    entity_data = [
        [Paragraph("Estructura", table_header_style), Paragraph("Ventajas", table_header_style), Paragraph("Consideraciones", table_header_style)],
        [Paragraph("<b>LLC en EE.UU.\n(Wyoming / Delaware)</b>", table_cell_style),
         Paragraph("Aceptada por todas las pasarelas de alto riesgo. Tributación en origen, simple de operar a distancia. Apertura 100% online en ~5 días.", table_cell_style),
         Paragraph("Requiere agente registrado anual (~$50-100/año). Cuenta bancaria en Mercury o Relay.", table_cell_style)],
        [Paragraph("<b>SRL en Argentina\ncon CBU Divisas</b>", table_cell_style),
         Paragraph("Útil para facturación local de servicios digitales. Monotributo o RI según volumen.", table_cell_style),
         Paragraph("Las pasarelas internacionales de alto riesgo pueden rechazarla. Requiere combinación con LLC.", table_cell_style)],
        [Paragraph("<b>Sociedad en Uruguay\nor Estonia (e-Residency)</b>", table_cell_style),
         Paragraph("Estonia ofrece e-Residency digital. Uruguay: fiscalidad territorial favorable para servicios digitales al exterior.", table_cell_style),
         Paragraph("Mayor tiempo de constitución. Costo contable recurrente.", table_cell_style)],
    ]
    t_ent = Table(entity_data, colWidths=[120, 220, 192])
    t_ent.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), primary_color),
        ('ALIGN',         (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('GRID',          (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING',       (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_ent)

    # ─── SECCIÓN 9 ───────────────────────────────────────────────────────────
    story.append(Paragraph("9. Plan de Acción Paso a Paso (Hoja de Ruta de Ejecución)", h1_style))

    roadmap_data = [
        [Paragraph("Fase", table_header_style), Paragraph("Acciones Clave a Ejecutar", table_header_style), Paragraph("Resultado / Entregable", table_header_style)],
        [Paragraph("<b>FASE 1\nCimientos Legales\n(Semanas 1-3)</b>", table_cell_style),
         Paragraph("• Constitución de entidad legal (LLC EE.UU. o SRL ARG).\n• Redacción de Términos y Condiciones, Política de Privacidad, Acuerdo de Creador y Formulario 2257.\n• Registro de base de datos ante AAIP.\n• Alta y configuración del proveedor KYC (Sumsub/Veriff).\n• Consulta con abogado de Derecho Digital para revisión de contratos.", table_cell_style),
         Paragraph("Estructura legal habilitada. Contratos firmados. Canal KYC operativo.", table_cell_style)],
        [Paragraph("<b>FASE 2\nDesarrollo MVP\n(Semanas 4-8)</b>", table_cell_style),
         Paragraph("• Feed social con posts públicos, de suscripción y PPV.\n• Motor de marcas de agua dinámicas en imágenes/videos.\n• Integración de pasarelas de pago (USDT Cripto + CCBill/Segpay en sandbox).\n• Moderación automatizada pre-publicación (Hive AI).\n• Almacenamiento seguro en AWS S3 + CloudFront firmado.", table_cell_style),
         Paragraph("Plataforma web PWA funcional, procesando pagos en entorno de prueba.", table_cell_style)],
        [Paragraph("<b>FASE 3\nNovios Virtuales\n& Escala\n(Semanas 9-12)</b>", table_cell_style),
         Paragraph("• Módulo de videollamadas WebRTC 1a1 con tarifado por minuto en tiempo real.\n• Calendario de reservas y sistema de agenda para citas virtuales.\n• Onboarding de creadores beta testers y ajuste de flujo KYC.\n• Activación de pasarelas en producción.\n• Campaña de lanzamiento y adquisición de usuarios.", table_cell_style),
         Paragraph("Plataforma pública completa con todas las funciones operativas.", table_cell_style)],
    ]
    t_road = Table(roadmap_data, colWidths=[90, 292, 150])
    t_road.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), primary_color),
        ('ALIGN',         (0,0), (-1,-1), 'LEFT'),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('GRID',          (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [colors.white, bg_light]),
        ('PADDING',       (0,0), (-1,-1), 4.5),
    ]))
    story.append(t_road)

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=6))
    story.append(Paragraph(
        "<b>Conclusión y Próximos Pasos:</b> Cumpliendo con la hoja de ruta y los marcos normativos descriptos en este documento, "
        "el cliente contará con una plataforma sólida, escalable y 100% blindada jurídicamente. El primer paso recomendado es "
        "la consulta con un abogado especialista en Derecho Digital para la firma de contratos y la elección de la jurisdicción legal, "
        "en paralelo con la configuración del sistema KYC y las pasarelas de pago de alto riesgo.",
        body_style))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado con éxito: {filename}")


if __name__ == "__main__":
    output_pdf = r"c:\Users\Rodrigo\Desktop\CODEARG PAGINAS WEBS\pagina para adultos\Informe_Legal_y_Tecnico_Plataforma_Adultos.pdf"
    create_pdf(output_pdf)
