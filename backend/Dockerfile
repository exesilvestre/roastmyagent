FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY docker-entrypoint.sh ./
# Normalize CRLF from Windows checkouts; execve on ./script fails with "no such file" when shebang is /bin/sh\r
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
