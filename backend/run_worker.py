"""Run one separately hosted worker: python -m backend.run_worker.

Use the same Neon, object storage, vault key and provider environment as the API.
"""
import asyncio
import os
import signal

async def main():
    os.environ.setdefault('AGRO_QUEUE_POLL_SECONDS','5')
    from . import pipeline, infrastructure
    if not infrastructure.config().get('database_url'):
        raise RuntimeError('The standalone worker requires the shared Neon database configuration.')
    stopped=asyncio.Event()
    loop=asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:loop.add_signal_handler(sig,stopped.set)
        except NotImplementedError:pass
    tasks=[asyncio.create_task(pipeline.worker()),asyncio.create_task(pipeline.scheduler())]
    stop_task=asyncio.create_task(stopped.wait())
    try:
        done,_=await asyncio.wait([*tasks,stop_task],return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            if task is not stop_task:task.result()
    finally:
        for task in [*tasks,stop_task]:task.cancel()
        await asyncio.gather(*tasks,stop_task,return_exceptions=True)

if __name__=='__main__':asyncio.run(main())
