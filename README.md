# Portfolio Mapper

![screen grab](https://user-images.githubusercontent.com/4499581/79871138-d9994b00-83db-11ea-95e1-4edd6067d6ff.png)

You need some google credentials

```json
{
  "type": "service_account",
  "project_id": "portfolio-mapper",
  "private_key_id": "",
  "private_key": "",
  "client_email": "",
  "client_id": "",
  "auth_uri": "",
  "token_uri": "",
  "auth_provider_x509_cert_url": "",
  "client_x509_cert_url": ""
}
```

1. create a service account
2. download the json version of the credentials
3. require this file in `/lib/createMapping.js`
4. share documents you'll be mapping with the `client_email` from these settings
