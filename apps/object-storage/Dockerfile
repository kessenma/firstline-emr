FROM rustfs/rustfs:latest

WORKDIR /data

EXPOSE 9100 9001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9100/rustfs/health/live

USER 10001

CMD ["/data"]
