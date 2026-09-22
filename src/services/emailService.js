var Resend = require("resend").Resend;
require("dotenv").config();

var resend = new Resend(process.env.RESEND_API_KEY);


async function enviarEmail(email, token) {

    var link = `http://localhost:3000/api/verificarEmail?token=${token}`;

    var resultado = await resend.emails.send({

        from: "Autenticação de cadastro <onboarding@resend.dev>",

        to: ['isabella.csantos@sptech.school'],

        subject: "Verifique seu email",

        html: `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <tr>
                    <td align="center">

                        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

                            <tr>
                                <td style="padding: 40px 40px 32px 40px;">

                                    <h2 style="margin:0 0 12px 0; color:#1a1f5c; font-size: 22px; font-weight: 700;">
                                        Verificação de email
                                    </h2>

                                    <p style="margin:0 0 28px 0; color:#5a6072; font-size: 15px; line-height: 1.6;">
                                        Falta pouco! Clique no botão abaixo para confirmar seu email e ativar sua conta na Noctua.
                                    </p>

                                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td align="center">

                                                <a href="${link}" target="_blank"
                                                   style="display:inline-block; background-color:#3854e0; color:#ffffff; text-decoration:none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">
                                                    Verificar email
                                                </a>

                                            </td>
                                        </tr>
                                    </table>

                                    <p style="margin: 28px 0 0 0; color:#9599a8; font-size: 13px; line-height: 1.6; text-align:center;">
                                        Este link expira em 15 minutos. Se você não criou uma conta, pode ignorar este email com segurança.
                                    </p>

                                </td>
                            </tr>

                            <tr>
                                <td style="background-color:#f4f5f7; padding: 20px 40px; text-align:center; border-top: 1px solid #eceef1;">

                                    <p style="margin:0; color:#9599a8; font-size: 12px; line-height: 1.6;">
                                        © 2026 Noctua. Todos os direitos reservados.<br>
                                        Visibilidade total sobre sua infraestrutura.
                                    </p>

                                </td>
                            </tr>

                        </table>

                    </td>
                </tr>
            </table>
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