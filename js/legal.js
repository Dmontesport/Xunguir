'use strict';

// Textos legais (borradores para revisar por un profesional) e a súa aceptación.
// Ao cambiar algún texto de forma importante, subir VERSION: pedirase aceptalo de novo.
X.legal = (() => {
  const VERSION = '2026-10-26';
  const ACEPTAR = ['termos', 'privacidade'];
  const T = () => X.TITULAR;
  const e = s => X.u.esc(s);

  const titular = () => `<p><b>${e(T().nome)}</b> · NIF ${e(T().nif)} · ${e(T().localidade)} · ${e(T().correo)}</p>`;

  const DOCS = {
    aviso: {
      titulo: 'Aviso legal',
      html: () => `
        <p>En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de que la aplicación Xunguir es ofrecida por:</p>
        ${titular()}
        <p>Xunguir es una aplicación de gestión de explotaciones ganaderas (animales, parcelas, almacén de forraje y avisos) que se encuentra en <b>fase de pruebas</b>, con acceso solo por invitación.</p>
        <p>El uso de la aplicación implica la aceptación de los <a href="#" data-accion="ver-legal" data-doc="termos">Términos de uso</a> y de la <a href="#" data-accion="ver-legal" data-doc="privacidade">Política de privacidad</a>.</p>`,
    },
    privacidade: {
      titulo: 'Política de privacidad',
      html: () => `
        <h4>Responsable</h4>
        ${titular()}
        <h4>Qué datos se tratan</h4>
        <ul>
          <li><b>Datos de la cuenta:</b> correo electrónico y contraseña (la contraseña se guarda cifrada y nunca es visible).</li>
          <li><b>Datos de la explotación</b> que tú introduces: animales (identificación, raza, fechas, pesos, reproducción, fotos), parcelas, grupos, almacén, ventas (incluido el nombre del comprador si lo anotas) y notas.</li>
          <li><b>Datos técnicos</b> necesarios para el funcionamiento (fecha de las modificaciones, aceptación de estos textos).</li>
        </ul>
        <p>Xunguir <b>no solicita ni guarda el DNI/NIF</b> del titular de la explotación. Al leer el DIB solo se toman el número del animal, su fecha de nacimiento, el sexo y la raza.</p>
        <h4>Para qué y con qué base</h4>
        <ul>
          <li>Prestarte el servicio (guardar y sincronizar tus datos entre tus dispositivos, calcular avisos): ejecución del contrato que aceptas al usar la aplicación (art. 6.1.b RGPD).</li>
          <li>Comunicaciones sobre el servicio (cambios, incidencias, fin de la fase de pruebas): interés legítimo (art. 6.1.f RGPD).</li>
        </ul>
        <p>No se usan tus datos para publicidad ni se venden ni ceden a terceros.</p>
        <h4>Tus datos de la explotación</h4>
        <p>Los datos de tu explotación son tuyos. Respecto a ellos, ${e(T().nome)} actúa como <b>encargado del tratamiento</b> por tu cuenta, en los términos del apartado «Encargo de tratamiento» de los <a href="#" data-accion="ver-legal" data-doc="termos">Términos de uso</a>. Si anotas datos de otras personas (por ejemplo, compradores), eres responsable de poder hacerlo.</p>
        <h4>Dónde se guardan</h4>
        <p>En los servidores de <b>Supabase</b> (base de datos, cuentas y fotos), en la Unión Europea, que actúa como subencargado del tratamiento con las garantías del RGPD. La aplicación (sin datos personales) se descarga desde GitHub Pages. También se guarda una copia en tu propio dispositivo para que funcione sin conexión.</p>
        <h4>Cuánto tiempo</h4>
        <p>Mientras mantengas tu cuenta. Al borrar la cuenta se eliminan tus datos y fotos del servidor. Las copias de seguridad técnicas del proveedor se eliminan en sus plazos habituales.</p>
        <h4>Tus derechos</h4>
        <p>Puedes acceder, rectificar, descargar (portabilidad) y borrar tus datos desde la propia aplicación (Configuración → Mi cuenta), y ejercer también los derechos de oposición y limitación escribiendo a ${e(T().correo)}. Si consideras que no se han atendido, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).</p>
        <h4>Cookies y almacenamiento</h4>
        <p>La aplicación solo usa el almacenamiento técnico del navegador necesario para funcionar (sesión y datos sin conexión). No usa cookies de análisis ni de publicidad.</p>`,
    },
    termos: {
      titulo: 'Términos de uso (fase de pruebas)',
      html: () => `
        <h4>1. Objeto</h4>
        <p>Estos términos regulan el uso de Xunguir, aplicación de gestión de explotaciones ganaderas ofrecida por ${e(T().nome)} (en adelante, «el prestador»).</p>
        <h4>2. Fase de pruebas y acceso</h4>
        <p>La aplicación está en <b>fase de pruebas (beta)</b>. El acceso es gratuito, solo por invitación y personal: una cuenta corresponde a una explotación. El prestador puede modificar, suspender o terminar la fase de pruebas avisando con antelación razonable, y en ese caso podrás descargar tus datos.</p>
        <h4>3. Uso correcto</h4>
        <p>Te comprometes a usar la aplicación de forma lícita, a custodiar tu contraseña y a no intentar acceder a datos de otros usuarios ni alterar el funcionamiento del servicio.</p>
        <h4>4. Tus datos</h4>
        <p>Los datos que introduces son tuyos. Puedes descargarlos en cualquier momento (Configuración → Descargar copia) y borrar tu cuenta. Al estar en pruebas pueden producirse fallos: <b>se recomienda descargar copias periódicamente</b>.</p>
        <h4>5. Carácter orientativo de los cálculos y limitación de responsabilidad</h4>
        <ul>
          <li>El peso teórico, las fechas previstas de celo y parto, la comida disponible en las parcelas, las propuestas de ración y el resto de cálculos son <b>estimaciones orientativas</b> basadas en modelos generales y en los datos que introduces. Pueden no corresponder con la realidad de cada animal o parcela.</li>
          <li>La aplicación <b>no sustituye</b> al Documento de Identificación Bovina (DIB), al crotal, al libro de registro de la explotación, a SITRAN/REGA ni a ninguna otra obligación oficial, ni al criterio de un veterinario o técnico. El cumplimiento de la normativa de identificación, registro, movimientos, sanidad y bienestar animal es responsabilidad del titular de la explotación.</li>
          <li>La lectura de códigos (DIB, crotales) puede contener errores: revisa siempre los datos antes de guardarlos.</li>
          <li>El servicio se ofrece «tal cual», sin garantía de disponibilidad continua ni ausencia de errores. En la medida permitida por la ley, el prestador no responde de daños derivados de decisiones tomadas a partir de la información de la aplicación, de interrupciones del servicio o de la pérdida de datos no imputable a dolo o culpa grave.</li>
        </ul>
        <h4>6. Encargo de tratamiento (art. 28 RGPD)</h4>
        <p>Respecto a los datos personales que incluyas en tu explotación, tú eres el responsable y el prestador el encargado del tratamiento, que se compromete a: tratarlos solo para prestar el servicio y según tus instrucciones; garantizar la confidencialidad de las personas autorizadas; aplicar medidas de seguridad adecuadas (acceso cifrado, aislamiento de cada cuenta, copias del proveedor); recurrir solo a subencargados con garantías (actualmente Supabase, en la UE); ayudarte a atender los derechos de los interesados; notificarte sin dilación las violaciones de seguridad que te afecten; y suprimir los datos al terminar el servicio, salvo obligación legal de conservarlos.</p>
        <h4>7. Baja</h4>
        <p>Puedes dejar de usar la aplicación y borrar tu cuenta en cualquier momento desde Configuración → Mi cuenta.</p>
        <h4>8. Cambios en estos términos</h4>
        <p>Si se modifican de forma relevante, se te pedirá aceptarlos de nuevo al entrar.</p>
        <h4>9. Ley aplicable</h4>
        <p>Estos términos se rigen por la legislación española. Para cualquier controversia serán competentes los juzgados y tribunales que correspondan conforme a la ley.</p>`,
    },
  };

  function ver(doc) {
    const d = DOCS[doc];
    if (!d) return;
    X.ui.modal.abrir(`${X.ui.cab(d.titulo)}
      <div class="modal-corpo texto-legal">${d.html()}<p class="nota">${X.t('versionLegal', { v: VERSION })}</p></div>`);
  }

  X.accions['ver-legal'] = el => ver(el.dataset.doc);

  // ¿Aceptou o usuario a versión actual? Lémbrase no dispositivo para poder entrar sen conexión
  const claveLocal = () => `xunguir.aceptado.${X.nube.uid() || X.nube.uidSenConexion()}`;
  async function aceptado() {
    if (localStorage.getItem(claveLocal()) === VERSION) return true;
    if (!X.nube.sesion()) return false;
    const docs = await X.nube.aceptacions(VERSION);
    const ok = ACEPTAR.every(d => docs.includes(d));
    if (ok) localStorage.setItem(claveLocal(), VERSION);
    return ok;
  }
  async function aceptar() {
    await X.nube.aceptar(ACEPTAR, VERSION);
    localStorage.setItem(claveLocal(), VERSION);
  }

  return { VERSION, ver, aceptado, aceptar };
})();
