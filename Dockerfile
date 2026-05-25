FROM python:3.12.10-slim-bookworm AS wheels

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY requirements.txt .
RUN python -m pip wheel --wheel-dir /wheels -r requirements.txt

FROM python:3.12.10-slim-bookworm AS runtime

LABEL org.opencontainers.image.title="RouterOS Read-only Semantic Triage Console" \
      org.opencontainers.image.description="Read-only RouterOS semantic triage panel" \
      org.opencontainers.image.source="https://github.com/cullysu/ros-ikuai-monitor-panel"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    ROS_PANEL_BIND=0.0.0.0 \
    ROS_PANEL_PORT=28646 \
    ROS_PANEL_TARGET_IP=auto \
    ROS_PANEL_PROFILE=routeros_only \
    ROS_PANEL_IP_ALIAS_WRITE_ENABLED=0 \
    ROS_PANEL_EXPOSE_ADMIN_SESSIONS=0

WORKDIR /app

RUN groupadd --system panel \
    && useradd --system --gid panel --home-dir /app --shell /usr/sbin/nologin panel

COPY --from=wheels /wheels /wheels
COPY requirements.txt .
RUN python -m pip install --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels

COPY app.py ./
COPY public ./public

RUN mkdir -p /app/data \
    && chown -R panel:panel /app

USER panel
EXPOSE 28646

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health' % os.getenv('ROS_PANEL_PORT', '28646'), timeout=3).read()"

CMD ["python", "app.py"]
