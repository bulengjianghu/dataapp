# DataApp Backend

## Local Start

### Infrastructure

1. Run `docker compose up -d` in `backend/`.
2. Ensure PostgreSQL, Redis and MinIO are available on the default ports.

### System Toolchain

1. Verify the host toolchain:
   `java -version`
   `mvn -v`
2. Build the executable jar:
   `mvn -pl dataapp-boot -am -Dmaven.test.skip=true package`
3. Start the app:
   `java -jar dataapp-boot/target/dataapp-boot-1.0.0-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/dataapp --spring.data.redis.host=localhost --app.minio.endpoint=http://localhost:9000`
4. Stop the app:
   `lsof -nP -iTCP:8080 -sTCP:LISTEN`
   `kill <pid>`

### Project-local Wrapper

1. Verify the wrapper toolchain:
   `./.tools/java -version`
   `./.tools/mvn -version`
2. Build the executable jar:
   `./.tools/mvn -pl dataapp-boot -am -Dmaven.test.skip=true package`
3. Start the app:
   `./.tools/java -jar dataapp-boot/target/dataapp-boot-1.0.0-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://host.docker.internal:5432/dataapp --spring.data.redis.host=host.docker.internal --app.minio.endpoint=http://host.docker.internal:9000`

## Smoke API Flow

1. Login:
   `POST /api/auth/login`
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
2. Query current user:
   `GET /api/auth/me`
   Header: `Authorization: Bearer <token>`
3. Create form:
   `POST /api/admin/forms`
   ```json
   {
     "name": "巡检表",
     "formCode": "inspection_form"
   }
   ```
4. Query form:
   `GET /api/admin/forms/{formId}`
5. Create record:
   `POST /api/records`
   ```json
   {
     "formId": 123456789000,
     "formVersionId": 1,
     "dataJson": "{\"device\":\"A-01\",\"result\":\"OK\"}"
   }
   ```
6. Query record:
   `GET /api/records/{recordId}`
7. Submit record:
   `POST /api/records/{recordId}/submit`
8. Re-submit the same record:
   expected result: `RECORD_STATUS_INVALID`

## Current Scope

- Multi-module Maven backend skeleton
- MVP modules: identity, form, record, file, audit
- Flyway migrations `V1` to `V9`
- JWT login, current-user query, form create/query, record create/query/submit
- Supports both system-level `java`/`mvn` and project-local Docker wrappers

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Verified Commands

- `mvn -pl dataapp-boot -am -Dmaven.test.skip=true package`
- `java -jar dataapp-boot/target/dataapp-boot-1.0.0-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/dataapp --spring.data.redis.host=localhost --app.minio.endpoint=http://localhost:9000`
- `curl http://localhost:8080/api/users/ping`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/admin/forms`
- `GET /api/admin/forms/{formId}`
- `POST /api/records`
- `GET /api/records/{recordId}`
- `POST /api/records/{recordId}/submit`
