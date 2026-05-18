const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {

    async function getTokenValue() {
        let body = [];

        const details = {
            grant_type: "client_credentials",
            resource: "00000003-0000-0ff1-ce00-000000000000/gascoglp.sharepoint.com@8510dd4d-19ec-4aea-8708-bc6a0ed235c3",
            client_id: "bd143cf5-f8b3-40d8-9d73-e65ba672e25e@8510dd4d-19ec-4aea-8708-bc6a0ed235c3",
            client_secret: "RWFVOFF+ZFdVUFhTSWdlVXhSUVd1fkl1VDIuc3BOREFKMDVnYWNEWg=="
        };

        for (const property in details) {
            const encodedKey = encodeURIComponent(property);
            const encodedValue = encodeURIComponent(details[property]);
            body.push(`${encodedKey}=${encodedValue}`);
        }

        try {
            const dest = await cds.connect.to("GESTOR_DOCUMENTAL");

            const responseToken = await dest.send({
                method: "POST",
                path: "",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data: body.join("&")
            });

            const tokenBody = typeof responseToken === "string"
                ? JSON.parse(responseToken)
                : responseToken;

            if (!tokenBody || !tokenBody.access_token) {
                return {
                    success: false,
                    message: "Ha ocurrido un error con el token"
                };
            }

            return {
                access_token: tokenBody.access_token,
                token_type: tokenBody.token_type,
                expires_in: Number(tokenBody.expires_in)
            };

        } catch (e) {
            return {
                success: false,
                message: e.message,
                accion: "getTokenValue"
            };
        }
    }

    this.on("getTokenValue", async () => {
        return await getTokenValue();
    });

});



