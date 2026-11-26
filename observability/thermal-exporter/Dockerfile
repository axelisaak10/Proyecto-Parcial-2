FROM python:3.13-alpine

WORKDIR /app
COPY exporter.py .

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "/app/exporter.py"]
