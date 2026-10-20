var Resend = require("resend").Resend;
require("dotenv").config();

var resend = new Resend(process.env.RESEND_API_KEY);


async function enviarEmail(email, token) {
    var link = `http://localhost:3000/usuarios/verificarEmail?token=${token}`;

    var resultado = await resend.emails.send({

        from: "Autenticação de cadastro <onboarding@resend.dev>",

        to: ['isabella.csantos@sptech.school'],

        subject: "Verifique seu email",


        html: `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="background-color:#F4F7FB; padding:40px 16px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <tr>
            <td align="center">

                <table role="presentation" width="480" cellpadding="0" cellspacing="0"
                    style="width:100%; max-width:480px; background-color:#FFFFFF; border:1px solid #DFE7F0; border-radius:12px; overflow:hidden;">
                    <tr>
                        <td style="padding:36px 32px 32px 32px;">

                            <p style="margin:0 0 10px 0; color:#12647A; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase;">
                                Ativação de conta
                            </p>

                            <h2 style="margin:0 0 16px 0; color:#0F172A; font-size:24px; line-height:1.3; font-weight:700;">
                                Verifique seu email
                            </h2>

                            <p style="margin:0 0 26px 0; color:#64748B; font-size:14px; line-height:1.8;">
                                Seja bem-vindo ao Nautilus! Para concluir seu cadastro e ativar sua conta, confirme seu endereço de email clicando no botão abaixo.
                            </p>

                            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${link}" target="_blank"
                                            style="display:inline-block; background-color:#12647A; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:14px 30px; border-radius:8px; line-height:1.4;">
                                            Confirmar meu email
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:26px 0 0 0; color:#64748B; font-size:12px; line-height:1.8; text-align:center;">
                                Este link expira em <strong style="color:#334155;">15 minutos</strong>.
                                Se você não criou uma conta, basta ignorar este email.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                style="margin-top:24px;">
                                <tr>
                                    <td style="border-top:1px solid #E2E8F0; padding-top:20px;">
                                        <p style="margin:0; color:#94A3B8; font-size:12px; line-height:1.7; word-break:break-word;">
                                            Se o botão não funcionar, copie e cole este endereço no navegador:
                                        </p>
                                        <p style="margin:8px 0 0 0; font-size:12px; line-height:1.6; word-break:break-all;">
                                            <a href="${link}" style="color:#12647A; text-decoration:underline;">
                                                ${link}
                                            </a>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>
                    <tr>
                        <td align="center"
                            style="background-color:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 28px;">

                            <p style="margin:0 0 6px 0; color:#334155; font-size:12px; font-weight:600;">
                                NAUTILUS
                            </p>

                            <p style="margin:0; color:#94A3B8; font-size:11px; line-height:1.8;">
                                Monitoramento inteligente de infraestrutura.<br>
                                &copy; 2026 Nautilus. Todos os direitos reservados.
                            </p>

                        </td>
                    </tr>

                </table >

            </td >
        </tr >
    </table >
        `
    });


    if (resultado.error) {

        console.error("Erro ao enviar email:", resultado.error);

        throw new Error("Falha ao enviar email de verificação");

    }


    console.log("Email enviado, id:", resultado.data.id);

    return resultado.data;
}


module.exports = {

    enviarEmail

};
